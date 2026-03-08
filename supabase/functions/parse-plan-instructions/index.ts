import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PARSE_FILE_BYTES = 20 * 1024 * 1024; // 20MB

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName } = await req.json();
    if (!fileUrl) return jsonResponse({ success: false, error: "Missing fileUrl" });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ success: false, error: "LOVABLE_API_KEY not configured" });

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return jsonResponse({ success: false, error: `Failed to download file: ${fileResponse.status}` });
    }

    const bytes = new Uint8Array(await fileResponse.arrayBuffer());
    if (bytes.length === 0) return jsonResponse({ success: false, error: "הקובץ ריק" });
    if (bytes.length > MAX_PARSE_FILE_BYTES) {
      return jsonResponse({ success: false, error: "הקובץ גדול מדי לניתוח אוטומטי (מקסימום 20MB)." });
    }

    const ext = (fileName || fileUrl).split("?")[0].toLowerCase();
    const isPdfExt = ext.endsWith(".pdf");
    let mimeType = "application/pdf";
    if (ext.endsWith(".png")) mimeType = "image/png";
    else if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (ext.endsWith(".webp")) mimeType = "image/webp";

    if (isPdfExt && !isPdf(bytes)) {
      return jsonResponse({
        success: false,
        error: "הקובץ שהועלה אינו PDF תקין. נראה שזה קובץ שגיאה/חסימה במקום מסמך אמיתי.",
      }, 400);
    }

    const base64 = base64Encode(bytes);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const systemPrompt = `You are an expert at extracting structured information from Israeli urban planning documents (הוראות תוכנית / plan instructions).

You MUST return ONLY valid JSON (no markdown, no backticks) with this exact shape:

{
  "details": {
    "פרטים": {"architect":"","architect_phone":"","architect_email":"","architect_address":"","manager":"","manager_phone":"","manager_email":"","manager_address":"","developer":"","developer_phone":"","developer_email":"","developer_address":"","date":""},
    "מיקום": {"quarter":"","street":"","block":"","parcel":""},
    "נתוני תב\\"ע": {"plan_overall":"","plan_detail":""}
  },
  "consultantNotes": {
    "תנועה": {"quote":"","comment":""},
    "תברואה": {"quote":"","comment":""},
    "ניהול ניקוז": {"quote":"","comment":""},
    "חשמל": {"quote":"","comment":""},
    "נטיעות": {"quote":"","comment":""},
    "איכות סביבה": {"quote":"","comment":""},
    "נכסים": {"quote":"","comment":""},
    "חינוך": {"quote":"","comment":""},
    "רישוי": {"quote":"","comment":""},
    "תכנון": {"quote":"","comment":""}
  },
  "projectDescription": "",
  "projectName": ""
}

CRITICAL INSTRUCTIONS for consultantNotes:
- For EACH consultant topic, find ALL relevant clauses, requirements, and conditions from the plan document.
- The "quote" field must contain the EXACT TEXT quoted from the document — full paragraphs, not summaries.
- Include section numbers, sub-sections, and specific quantitative requirements (numbers, areas, percentages).
- For תנועה (Traffic): parking ratios, EV charging, bicycle parking, traffic studies, road widths, access points.
- For תברואה (Sanitation): water supply lines, sewage connections, pipe diameters, connection points.
- For ניהול ניקוז (Drainage): runoff management, retention, infiltration, drainage plans.
- For חשמל (Electricity): transformer stations, electrical infrastructure, connection capacity.
- For נטיעות (Planting): tree preservation, new planting requirements, landscape plans, green areas.
- For איכות סביבה (Environment): noise, air quality, waste, green building standards, sustainability.
- For נכסים (Properties): unit counts, area calculations, FAR, building rights, unit mix.
- For חינוך (Education): school requirements, kindergartens, educational facilities.
- For רישוי (Licensing): building permits, height restrictions, flight paths, special permits.
- For תכנון (Planning): zoning, land use, building lines, setbacks, construction stages.
- Leave "comment" empty — it's for user notes.
- If a topic has no relevant content in the document, set quote to empty string.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: "נתח את המסמך לעומק. עבור כל נושא יועץ, צטט את כל הסעיפים הרלוונטיים מילה במילה מתוך המסמך. החזר JSON בלבד." },
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
    const content = aiData?.choices?.[0]?.message?.content ?? "";
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());
    return jsonResponse({ success: true, data: parsed });
  } catch (error) {
    console.error("Error parsing plan instructions:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to parse document" });
  }
});
