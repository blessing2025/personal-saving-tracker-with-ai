import "jsr:@supabase/functions-js/edge-runtime.d.ts";


const GEMINII_API_KEY = Deno.env.get('GEMINII_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINII_API_KEY) throw new Error("GEMINII_API_KEY is not set in Supabase secrets");
    
    const { audio, contentType } = await req.json();
    if (!audio) throw new Error("No audio data provided");

    console.log(`[AI] Calling Gemini API for content-type: ${contentType}`);
    const response = await fetch(`https://generativelanguage.googleapis.com/V1/models/gemini-2.5-flash:generateContent?key=${GEMINII_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'You are a professional financial assistant. Listen to this audio and extract expense details. Return ONLY a raw JSON object with the following keys: "amount" (number) and "category" (one of: Rent, Food, Transport, Groceries, Bills, Entertainment, Other). If you cannot find a value, return null for that key.' },
            { 
              inline_data: { 
                mime_type: contentType || "audio/webm", 
                data: audio 
              } 
            }
          ],
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Gemini API failed with status ${response.status}. Body:`, errorText);
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(`Gemini Error: ${data.error.message}`);
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error("[AI] No candidates returned from Gemini. Full Response:", JSON.stringify(data));
      throw new Error("AI could not understand the audio.");
    }

    const rawText = data.candidates[0].content.parts[0].text; 
    console.log("[AI] Raw response from Gemini:", rawText);
    
    // More robust parsing to handle both raw JSON and markdown-wrapped JSON
    let result;
    try {
      const cleanedText = rawText.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch (e) {
      console.error("[AI] Failed to parse JSON from Gemini:", rawText);
      throw new Error("AI returned an invalid data format");
    }

    console.log("[AI] Parsed Result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[AI] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
