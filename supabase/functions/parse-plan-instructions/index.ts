import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PARSE_FILE_BYTES = 8 * 1024 * 1024; // 8MB safety for edge compute

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPdf(bytes: Uint8Array) {
  if (bytes.length < 5) return false;
  // %PDF-
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function estimatePdfPages(bytes: Uint8Array) {
  // Fast heuristic: count '/Type /Page' markers
  const txt = new TextDecoder("latin1").decode(bytes);
  const matches = txt.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
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
      return jsonResponse({ success: false, error: "הקובץ גדול מדי לניתוח אוטומטי (מקסימום 8MB)." });
    }

    const ext = (fileName || fileUrl).split("?")[0].toLowerCase();
    const isPdfExt = ext.endsWith(".pdf");
    let mimeType = "application/pdf";
    if (ext.endsWith(".png")) mimeType = "image/png";
    else if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (ext.endsWith(".webp")) mimeType = "image/webp";

    if (isPdfExt) {
      if (!isPdf(bytes)) {
        return jsonResponse({
          success: false,
          error: "הקובץ שהועלה אינו PDF תקין. נראה שזה קובץ שגיאה/חסימה במקום מסמך אמיתי.",
        }, 400);
      }

      const pages = estimatePdfPages(bytes);
      if (pages === 0) {
        return jsonResponse({
          success: false,
          error: "ה-PDF לא מכיל עמודים קריאים ל-AI. נסה לשמור מחדש את המסמך או להעלות קובץ PDF אחר.",
        }, 400);
      }
    }

    const base64 = base64Encode(bytes);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const systemPrompt = `You are an expert at extracting structured information from Israeli urban planning documents (הוראות תוכנית / plan instructions).

Return ONLY valid JSON with this shape, omitting empty fields:
{
  "details": {
    "פרטים": {"architect":"","architect_phone":"","architect_email":"","architect_address":"","manager":"","manager_phone":"","manager_email":"","manager_address":"","developer":"","developer_phone":"","developer_email":"","developer_address":"","date":""},
    "מיקום": {"quarter":"","street":"","block":"","parcel":""},
    "נתוני תב\\"ע": {"plan_overall":"","plan_detail":""}
  },
  "consultantNotes": {"תנועה":"","תברואה":"","ניהול ניקוז":"","חשמל":"","נטיעות":"","איכות סביבה":"","נכסים":"","חינוך":"","רישוי":"","תכנון":""},
  "projectDescription": "",
  "projectName": ""
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: "נתח את המסמך והחזר JSON בלבד." },
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
