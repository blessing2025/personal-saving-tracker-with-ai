
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log("[Resend Function] Invoked."); // Log at the very beginning

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("[Notification] Critical: RESEND_API_KEY is not set in Supabase Secrets.");
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY secret" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, recipientEmail, payload } = await req.json();
    
    console.log(`[Notification] Incoming: type=${type}, to=${recipientEmail}`);
    console.log(`[Notification] Using Key starting with: ${RESEND_API_KEY?.substring(0, 7)}...`);

    const brandColor = "#4f46e5"; // Indigo 600
    const accentColor = "#10b981"; // Emerald 500

    let subject = "";
    let contentHtml = "";

    // Generate content based on alert type
    switch (type) {
      case 'income_added':
        subject = "Transaction Confirmed: New Income Recorded";
        const dateStr = payload?.date ? new Date(payload.date).toLocaleDateString() : new Date().toLocaleDateString();
        contentHtml = `
          <h1 style="color: ${brandColor}; font-size: 24px; margin-bottom: 16px;">Income Confirmed</h1>
          <p style="font-size: 16px; color: #475569; line-height: 1.5;">A new entry has been successfully added to your ledger.</p>
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Amount</div>
            <div style="font-size: 32px; font-weight: 800; color: ${accentColor}; margin-bottom: 16px;">${payload.amount} ${payload.currency}</div>
            <table style="width: 100%; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              <tr>
                <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Category</td>
                <td style="font-size: 14px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 8px;">${payload.category || 'General'}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; color: #64748b;">Date</td>
                <td style="font-size: 14px; color: #1e293b; font-weight: 600; text-align: right;">${dateStr}</td>
              </tr>
            </table>
          </div>
        `;
        break;
      
      case 'goal_completed':
        subject = "Congratulations! Goal Achieved";
        contentHtml = `
          <h1 style="color: ${accentColor}; font-size: 24px; margin-bottom: 16px;">You did it!</h1>
          <p style="font-size: 16px; color: #475569; line-height: 1.5;">You have successfully reached your savings target for <strong>${payload.goalName}</strong>. This is a significant milestone in your financial journey.</p>
          <div style="text-align: center; background: linear-gradient(135deg, ${brandColor}, #4338ca); border-radius: 16px; padding: 32px; margin: 24px 0; color: white;">
            <div style="font-size: 14px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Total Saved</div>
            <div style="font-size: 40px; font-weight: 800;">${payload.savedAmount} ${payload.currency}</div>
          </div>
        `;
        break;

      case 'monthly_summary':
        subject = `Performance Report: ${payload.monthName} ${payload.year}`;
        contentHtml = `
          <h1 style="color: ${brandColor}; font-size: 24px; margin-bottom: 16px;">Monthly Performance</h1>
          <p style="font-size: 16px; color: #475569; line-height: 1.5;">Your financial summary for <strong>${payload.monthName} ${payload.year}</strong> is ready for review.</p>
          
          <div style="margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
              <span style="color: #64748b; font-weight: 600;">Total Inflow</span>
              <span style="color: ${accentColor}; font-weight: 800;">+${payload.totalIncome} ${payload.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
              <span style="color: #64748b; font-weight: 600;">Total Outflow</span>
              <span style="color: #e11d48; font-weight: 800;">-${payload.totalExpenses} ${payload.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 16px; background-color: ${brandColor}; border-radius: 8px; color: white;">
              <span style="font-weight: 600;">Net Savings</span>
              <span style="font-weight: 800;">${payload.netSavings} ${payload.currency}</span>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error("Invalid notification type");
    }

    if (!recipientEmail) {
      console.error("Error: recipientEmail is missing from the request body.");
      throw new Error("Recipient email is required");
    }

    // Wrap content in professional template
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
            .header { padding: 32px; border-bottom: 1px solid #f1f5f9; text-align: left; }
            .body { padding: 32px; }
            .footer { padding: 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9; }
            .btn { display: inline-block; padding: 14px 28px; background-color: ${brandColor}; color: white !important; text-decoration: none; border-radius: 100px; font-weight: 700; font-size: 14px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="background-color: ${brandColor}; width: 40px; height: 40px; border-radius: 10px; text-align: center;">
                      <img src="logo.png" width="24" height="24" style="margin-top: 8px; border: none; display: inline-block;" alt="PST" />
                    </div>
                  </td>
                  <td style="padding-left: 12px; font-weight: 900; color: ${brandColor}; font-size: 20px; letter-spacing: -0.02em; vertical-align: middle;">
                    PST SYSTEM
                  </td>
                </tr>
              </table>
            </div>
            <div class="body">
              ${contentHtml}
              <a href="https://personal-saving-tracker-with-ai.vercel.app" class="btn">View Dashboard</a>
            </div>
            <div class="footer">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; 2026 Personal Saving Tracker. All Rights Reserved.</p>
              <p style="font-size: 10px; color: #cbd5e1; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.1em;">personal saving tracker</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'PST System <onboarding@resend.dev>', // Update this with your verified domain
        to: [recipientEmail], subject, html: fullHtml,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[Resend] API Error (${res.status}):`, data);
      return new Response(
        JSON.stringify({ error: data.message || "Resend API rejected the request", details: data }), 
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
