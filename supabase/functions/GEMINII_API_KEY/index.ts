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
    const { audio, contentType } = await req.json();
    if (!audio) throw new Error("No audio data provided");

    // Transcription & Extraction using Gemini 1.5 Flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINII_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'You are a financial assistant. Listen to this audio and extract the "amount" (as a number), the "currency" (e.g., "USD", "EUR", "GBP", "XOF", etc.), and the "category" (one of: Rent, Food, Transport, Groceries, Bills, Entertainment, or Other). If no currency is explicitly mentioned, assume USD. Return ONLY a raw JSON object with keys: amount, currency, and category.' },
            { 
              inline_data: { 
                mime_type: contentType || "audio/webm", 
                data: audio 
              } 
            }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Gemini API failed with status ${response.status}:`, errorText);
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(`Gemini Error: ${data.error.message}`);

    const rawText = data.candidates[0].content.parts[0].text; // Assuming Gemini returns JSON in a code block
    const cleanedText = rawText.replace(/```json|```/g, "").trim(); // Remove markdown code block
    const result = JSON.parse(cleanedText); // Parse the cleaned JSON string
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
