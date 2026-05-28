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
    
    const body = await req.json();
    const { audio, contentType, mode, context } = body;

    let prompt = '';
    let parts: any[] = [];

    if (mode === 'investment_ideas') {
      prompt = `You are a world-class financial advisor. Based on a monthly income of ${context.income} and expenses of ${context.expenses} (${context.currency}), suggest 3 professional investment ideas. Keep suggestions brief, high-end, and realistic. Return ONLY a raw JSON array of strings. Example: ["Index Funds", "Real Estate REITs", "High-Yield Bonds"].`;
      parts = [{ text: prompt }];
    } else {
      if (!audio) throw new Error("No audio data provided");
      prompt = 'You are a professional financial assistant. Listen to this audio and extract ALL expense transactions mentioned. Return ONLY a raw JSON array of objects. Each object must have "amount" (number) and "category" (one of: Rent, Food, Transport, Groceries, Bills, Entertainment, Utilities, Health, Shopping, Education, Travel, Insurance, Auto, Electronics, Misc, Other). Example: [{"amount": 10.50, "category": "Food"}, {"amount": 40, "category": "Transport"}]. If no expenses are found, return [].';
      parts = [
        { text: prompt },
        { inline_data: { mime_type: contentType || "audio/webm", data: audio } }
      ];
    }

    console.log(`[AI] Calling Gemini API mode: ${mode || 'voice_parsing'}`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINII_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts
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
