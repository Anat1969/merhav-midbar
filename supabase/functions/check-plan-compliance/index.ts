import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectDescription, consultantNotes, projectDetails } = await req.json();
    
    if (!projectDescription) {
      return jsonResponse({ success: false, error: "Missing project description" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ success: false, error: "LOVABLE_API_KEY not configured" });
    }

    // Build context from consultant notes (plan requirements)
    let requirementsContext = "";
    if (consultantNotes && typeof consultantNotes === "object") {
      for (const [party, data] of Object.entries(consultantNotes)) {
        const noteData = data as { quote?: string; comment?: string } | undefined;
        if (noteData?.quote) {
          requirementsContext += `\n\n### דרישות ${party}:\n${noteData.quote}`;
        }
      }
    }

    // Build details context
    let detailsContext = "";
    if (projectDetails && typeof projectDetails === "object") {
      for (const [section, fields] of Object.entries(projectDetails)) {
        const fieldsObj = fields as Record<string, string>;
        const fieldsList = Object.entries(fieldsObj)
          .filter(([_, val]) => val)
          .map(([key, val]) => `${key}: ${val}`)
          .join(", ");
        if (fieldsList) {
          detailsContext += `\n${section}: ${fieldsList}`;
        }
      }
    }

    if (!requirementsContext.trim()) {
      return jsonResponse({ 
        success: false, 
        error: "לא נמצאו הוראות תוכנית לבדיקה. יש להעלות קודם הוראות תוכנית ולוודא שהדרישות נותחו." 
      });
    }

    const systemPrompt = `אתה מומחה לבדיקת תוכניות בינוי בישראל. תפקידך להשוות בין תיאור בקשה לתוכנית בינוי לבין דרישות הוראות התוכנית.

עליך לבדוק:
1. האם הבקשה תואמת את הדרישות של כל גורם (תנועה, תברואה, ניקוז, חשמל, נטיעות, איכות סביבה, נכסים, חינוך, רישוי, תכנון)
2. האם יש סתירות בין הבקשה להוראות
3. האם יש דרישות שלא מתייחסים אליהן בבקשה
4. האם יש נושאים בבקשה שדורשים התייחסות נוספת

החזר תשובה מפורטת בעברית בפורמט הבא:

## ✅ תואם להוראות:
[רשימת נקודות שתואמות]

## ⚠️ דרוש בדיקה/השלמה:
[נושאים שדורשים תשומת לב או השלמה]

## ❌ לא תואם / סתירות:
[נקודות שלא תואמות את ההוראות או סותרות אותן]

## 📋 המלצות:
[המלצות לפעולה]`;

    const userPrompt = `## פרטי הפרויקט:${detailsContext}

## תיאור הבקשה לתוכנית בינוי:
${projectDescription}

## דרישות הוראות התוכנית:${requirementsContext}

בדוק את התאמת הבקשה להוראות התוכנית והחזר דוח מפורט.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    const aiText = await aiResponse.text();

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return jsonResponse({ success: false, error: "Rate limit reached. Try again shortly.", code: 429 });
      }
      if (aiResponse.status === 402) {
        return jsonResponse({ success: false, error: "Payment required for AI usage.", code: 402 });
      }
      return jsonResponse({ success: false, error: `AI API error: ${aiResponse.status} - ${aiText}` });
    }

    const aiData = JSON.parse(aiText);
    const content = aiData?.choices?.[0]?.message?.content ?? "";

    return jsonResponse({ success: true, report: content });
  } catch (error) {
    console.error("Error checking plan compliance:", error);
    return jsonResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to check compliance" 
    });
  }
});
