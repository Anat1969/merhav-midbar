import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PARSE_FILE_BYTES = 10 * 1024 * 1024; // 10MB (reduced from 20MB to stay within memory limits)

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPdf(bytes: Uint8Array) {
  if (bytes.length < 5) return false;
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function isZip(bytes: Uint8Array) {
  if (bytes.length < 4) return false;
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Extract embedded images from a DOCX file and upload them to Supabase storage */
async function extractDocxImages(bytes: Uint8Array, projectId: number): Promise<{ slot: string; url: string }[]> {
  try {
    if (!isZip(bytes)) return [];
    
    // Lazy-load JSZip only when needed
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    const zip = await JSZip.loadAsync(bytes);
    const mediaFiles: { name: string; data: Uint8Array; mime: string }[] = [];
    
    for (const [path, file] of Object.entries(zip.files)) {
      if (path.startsWith("word/media/") && !file.dir) {
        const lower = path.toLowerCase();
        let mime = "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
        else if (lower.endsWith(".png")) mime = "image/png";
        else if (lower.endsWith(".gif")) mime = "image/gif";
        else if (lower.endsWith(".webp")) mime = "image/webp";
        else if (lower.endsWith(".emf") || lower.endsWith(".wmf") || lower.endsWith(".tiff")) continue;
        
        const data = await (file as any).async("uint8array");
        if (data.length > 5000) {
          mediaFiles.push({ name: path.split("/").pop()!, data, mime });
        }
      }
    }
    
    if (mediaFiles.length === 0) return [];
    
    mediaFiles.sort((a, b) => b.data.length - a.data.length);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const slots = ["hadmaya", "tashrit", "tza"];
    const results: { slot: string; url: string }[] = [];
    
    for (let i = 0; i < Math.min(mediaFiles.length, slots.length); i++) {
      const img = mediaFiles[i];
      const ext = img.mime.split("/")[1] === "jpeg" ? "jpg" : img.mime.split("/")[1];
      const storagePath = `binui/${projectId}/images/${slots[i]}-${Date.now()}-${i}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, img.data, { contentType: img.mime, upsert: true });
      
      if (!uploadError) {
        const { data: publicData } = supabase.storage
          .from("project-files")
          .getPublicUrl(storagePath);
        
        results.push({ slot: slots[i], url: publicData.publicUrl });
      }
    }
    
    return results;
  } catch (e) {
    console.error("Error extracting DOCX images:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, projectId } = await req.json();
    if (!fileUrl) return jsonResponse({ success: false, error: "Missing fileUrl" });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ success: false, error: "LOVABLE_API_KEY not configured" });

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return jsonResponse({ success: false, error: `Failed to download file: ${fileResponse.status}` });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    if (arrayBuffer.byteLength === 0) return jsonResponse({ success: false, error: "הקובץ ריק" });
    if (arrayBuffer.byteLength > MAX_PARSE_FILE_BYTES) {
      return jsonResponse({ success: false, error: "הקובץ גדול מדי לניתוח אוטומטי (מקסימום 10MB)." });
    }

    let bytes = new Uint8Array(arrayBuffer);

    const ext = (fileName || fileUrl).split("?")[0].toLowerCase();
    const isDocx = ext.endsWith(".docx");
    const isPdfExt = ext.endsWith(".pdf");
    let mimeType = "application/pdf";
    if (ext.endsWith(".png")) mimeType = "image/png";
    else if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (ext.endsWith(".webp")) mimeType = "image/webp";
    else if (isDocx) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext.endsWith(".doc")) mimeType = "application/msword";

    if (isPdfExt && !isPdf(bytes)) {
      return jsonResponse({ success: false, error: "הקובץ שהועלה אינו PDF תקין." }, 400);
    }

    // Step 1: Extract DOCX images FIRST (before base64), then release zip memory
    let extractedImages: { slot: string; url: string }[] = [];
    if (isDocx && projectId) {
      extractedImages = await extractDocxImages(bytes, projectId);
    }

    // Step 2: Base64 encode for AI, then release raw bytes
    const base64 = base64Encode(bytes);
    // @ts-ignore - allow GC to reclaim bytes
    bytes = null as any;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const systemPrompt = `You are an expert at extracting structured information from Israeli urban planning committee protocols (פרוטוקול ועדה).

You MUST return ONLY valid JSON (no markdown, no backticks) with this exact shape:

{
  "details": {
    "פרטים": {
      "architect": "",
      "architect_phone": "",
      "architect_email": "",
      "architect_address": "",
      "manager": "",
      "manager_phone": "",
      "manager_email": "",
      "manager_address": "",
      "developer": "",
      "developer_phone": "",
      "developer_email": "",
      "developer_address": "",
      "date": ""
    },
    "מיקום": {
      "quarter": "",
      "street": "",
      "block": "",
      "parcel": ""
    },
    "נתוני תבע": {
      "plan_overall": "",
      "plan_detail": ""
    }
  },
  "plan_name": "",
  "plan_number": "",
  "note": "",
  "fullText": ""
}

CRITICAL EXTRACTION INSTRUCTIONS:
1. DETAILS SECTION (פרטים):
   - Look for tables with יזם (Developer), אדריכל (Architect), מנהל פרויקט (Project Manager)
   - Extract name, phone number (טלפון/נייד), email (מייל/דוא"ל), address (כתובת)
   - Hebrew names should be extracted as-is

2. LOCATION SECTION (מיקום):
   - block (גוש): the land block number
   - parcel (חלקה): the parcel/plot number
   - street (כתובת/רחוב): street address or plot identifier (e.g., "מגרש 18")
   - quarter (רובע): neighborhood or quarter if mentioned

3. PLANNING DATA (נתוני תב"ע):
   - plan_overall (מס' תוכנית): main plan number (e.g., "תב/1714")
   - plan_detail (תוכנית בינוי): detailed plan number (e.g., "במ/196/3")

4. PLAN NAME & NUMBER (top level fields):
   - plan_name: The name/title of the plan or project (שם התוכנית / שם הפרויקט). This is typically at the top of the document.
   - plan_number: The main plan number (מספר תוכנית). Same as plan_overall but kept at top level for convenience.

5. NOTE FIELD:
   - Summarize the project purpose and scope
   - Include: building type, number of floors, number of units/rooms
   - Include the main goal (מטרת התב"ע)

6. FULL TEXT FIELD:
   - Include ALL text from the document - every single word, table, heading, paragraph
   - This should be the COMPLETE content for reference
   - Include tables, requirements, approvals, recommendations, consultant opinions
   - Include all consultant remarks (הערות יועצים), conditions (תנאים), requirements (דרישות)
   - Format with clear sections and line breaks
   - Do NOT summarize or shorten - copy EVERYTHING

Return empty strings for fields you cannot find. Do NOT make up data.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: "נתח את פרוטוקול הועדה לעומק. חלץ את כל הנתונים האפשריים - פרטי יזם, אדריכל, מנהל פרויקט, נתוני מיקום, נתוני תב\"ע, שם התוכנית ומספר התוכנית. העתק את כל הטקסט מהמסמך במלואו לשדה fullText - כל מילה, כל טבלה, כל הערה. החזר JSON בלבד." },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    const aiText = await aiResponse.text();

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return jsonResponse({ success: false, error: "Rate limit reached. Try again shortly.", code: 429 });
      if (aiResponse.status === 402) return jsonResponse({ success: false, error: "Payment required for AI usage.", code: 402 });
      return jsonResponse({ success: false, error: `AI API error: ${aiResponse.status} - ${aiText}` });
    }

    const aiData = JSON.parse(aiText);

    if (aiData.usage) {
      console.log("Token usage:", JSON.stringify({
        prompt_tokens: aiData.usage.prompt_tokens,
        completion_tokens: aiData.usage.completion_tokens,
        total_tokens: aiData.usage.total_tokens,
        model: aiData.model
      }));
    }

    const content = aiData?.choices?.[0]?.message?.content ?? "";
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());
    
    return jsonResponse({ 
      success: true, 
      data: { 
        ...parsed, 
        extractedImages
      } 
    });
  } catch (error) {
    console.error("Error parsing protocol:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to parse document" });
  }
});
