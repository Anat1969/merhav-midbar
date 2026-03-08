import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName } = await req.json();

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "Missing fileUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Download the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);
    const fileBuffer = await fileResponse.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);
    
    if (bytes.length === 0) {
      return new Response(JSON.stringify({ error: "הקובץ ריק" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Deno's built-in base64 encoder (handles large files safely)
    const base64 = base64Encode(bytes);

    // Determine mime type
    const ext = (fileName || fileUrl).split("?")[0].toLowerCase();
    let mimeType = "application/pdf";
    if (ext.endsWith(".png")) mimeType = "image/png";
    else if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (ext.endsWith(".webp")) mimeType = "image/webp";

    console.log(`Processing file: ${fileName || "unknown"}, size: ${bytes.length}, mime: ${mimeType}`);

    const systemPrompt = `You are an expert at extracting structured information from Israeli urban planning documents (הוראות תוכנית / plan instructions).

Extract ALL relevant information and return a JSON object with the following structure. Only include fields you can find. All values should be strings in Hebrew.

{
  "details": {
    "פרטים": {
      "architect": "שם האדריכל",
      "architect_phone": "טלפון אדריכל",
      "architect_email": "אימייל אדריכל",
      "architect_address": "כתובת אדריכל",
      "manager": "שם מנהל הפרויקט",
      "manager_phone": "טלפון מנהל",
      "manager_email": "אימייל מנהל",
      "manager_address": "כתובת מנהל",
      "developer": "שם היזם",
      "developer_phone": "טלפון יזם",
      "developer_email": "אימייל יזם",
      "developer_address": "כתובת יזם",
      "date": "תאריך"
    },
    "מיקום": {
      "quarter": "רובע",
      "street": "כתובת/רחוב",
      "block": "גוש",
      "parcel": "חלקה"
    },
    "נתוני תב\\"ע": {
      "plan_overall": "מספר תוכנית כוללת",
      "plan_detail": "מספר תוכנית מפורטת"
    }
  },
  "consultantNotes": {
    "תנועה": "הנחיות/דרישות בנוגע לתנועה",
    "תברואה": "הנחיות/דרישות בנוגע לתברואה",
    "ניהול ניקוז": "הנחיות/דרישות בנוגע לניקוז",
    "חשמל": "הנחיות/דרישות בנוגע לחשמל",
    "נטיעות": "הנחיות/דרישות בנוגע לנטיעות/גינון",
    "איכות סביבה": "הנחיות/דרישות בנוגע לאיכות הסביבה",
    "נכסים": "הנחיות/דרישות בנוגע לנכסים",
    "חינוך": "הנחיות/דרישות בנוגע לחינוך/מוסדות",
    "רישוי": "הנחיות/דרישות בנוגע לרישוי",
    "תכנון": "הנחיות/דרישות כלליות לתכנון"
  },
  "projectDescription": "תיאור כללי של הפרויקט",
  "projectName": "שם הפרויקט אם מופיע"
}

Return ONLY valid JSON. Do not include fields with empty values. Extract as much information as possible from the document.`;

    // Use Gemini-native format for PDFs via the OpenAI-compatible gateway
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text: "נתח את המסמך הזה וחלץ את כל המידע הרלוונטי לפרויקט בינוי. החזר JSON בלבד.",
          },
        ],
      },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסה שוב מאוחר יותר" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "נדרשת הוספת קרדיטים" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (might be wrapped in markdown code block)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error parsing plan instructions:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to parse document" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
