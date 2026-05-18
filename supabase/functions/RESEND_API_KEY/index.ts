
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, payload } = await req.json();
    
    console.log(`[Notification] Incoming: type=${type}, to=${recipientEmail}`);
    console.log(`[Notification] Using Key starting with: ${RESEND_API_KEY?.substring(0, 7)}...`);
    
    let subject = "";
    let html = "";

    // Generate content based on alert type
    switch (type) {
      case 'income_added':
        subject = "New Income Recorded - Personal Saving Tracker";
        const dateStr = payload.date ? new Date(payload.date).toLocaleDateString() : new Date().toLocaleDateString();
        html = `
          <h1>Income Confirmed</h1>
          <p>A new entry of <strong>${payload.amount} ${payload.currency}</strong> has been added to your ledger.</p>
          <p>Category: ${payload.category || 'General'}</p>
          <p>Date: ${dateStr}</p>
        `;
        break;
      
      case 'goal_completed':
        subject = "Goal Achieved! - Personal Saving Tracker";
        html = `
          <h1>Congratulations!</h1>
          <p>You have successfully reached your target for: <strong>${payload.goalName}</strong>.</p>
          <p>Total Saved: ${payload.savedAmount} ${payload.currency}</p>
        `;
        break;

      case 'monthly_summary':
        subject = `Financial Summary: ${payload.monthName} ${payload.year}`;
        html = `
          <h1>Monthly Performance Report</h1>
          <ul>
            <li>Total Inflow: ${payload.totalIncome}</li>
            <li>Total Outflow: ${payload.totalExpenses}</li>
            <li>Net Savings: ${payload.netSavings}</li>
          </ul>
        `;
        break;

      default:
        throw new Error("Invalid notification type");
    }

    if (!recipientEmail) {
      console.error("Error: recipientEmail is missing from the request body.");
      throw new Error("Recipient email is required");
    }

    if (!RESEND_API_KEY) {
      console.error("Critical: RESEND_API_KEY is not set in Supabase Secrets.");
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY secret" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PST System <notifications@resend.com>', // IMPORTANT: Replace with your OWN verified domain on Resend.com
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`Resend API Error (Status ${res.status}):`, data);
      // Return the actual Resend error so we can see it in the browser network tab
      return new Response(JSON.stringify(data), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Edge Function Runtime Error:", error); // Log unexpected function errors
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
