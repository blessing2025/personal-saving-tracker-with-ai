import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AssemblyAI } from "npm:assemblyai";


const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY || '',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    if (!audio) throw new Error("No audio data provided");

    // 1. Transcription using AssemblyAI SDK
    const audioData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const transcriptRes = await client.transcripts.transcribe({
      audio: audioData,
      language_code: 'en_us',
    });

    if (transcriptRes.status === 'error') {
      throw new Error(`AssemblyAI Error: ${transcriptRes.error}`);
    }
    
    const transcript = transcriptRes.text || "";
    console.log("[AI] Transcribed Text:", transcript);

    // 2. Structured Data Extraction using GPT-4o-mini
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a financial assistant. Extract the "amount" (number) and "category" (Rent, Food, Transport, Groceries, Bills, Entertainment, or Other) from the text. Return ONLY valid JSON.' 
          },
          { role: 'user', content: `Text: "${transcript}"` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const gptData = await gptRes.json();
    if (gptData.error) throw new Error(`GPT Error: ${gptData.error.message}`);

    const result = JSON.parse(gptData.choices[0].message.content);
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