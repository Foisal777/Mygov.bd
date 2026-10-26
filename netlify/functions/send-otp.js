/* ============================================================
 * send-otp.js — issues a 6-digit OTP
 *
 * Body: { channel: "mobile"|"email", target: string, name?: string }
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  → stores hashed OTP
 *   DEMO_MODE=true                           → returns code on screen
 *   SMS_API_URL / SMS_API_KEY (optional)     → real SMS webhook
 * ============================================================ */
const {
  corsResponse,
  readBody,
  hashToken,
  generateCode,
  supabaseConfigured,
  supabaseRest,
  sendSmsWebhook,
} = require("./lib/otp");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse({ ok: true });
  if (event.httpMethod !== "POST") return corsResponse({ error: "Method not allowed" }, 405);

  const { channel = "mobile", target } = readBody(event);
  if (!target || !["mobile", "email"].includes(channel)) {
    return corsResponse({ error: "channel ও target আবশ্যক" }, 400);
  }

  // No Supabase configured, or explicit demo mode → return a fixed code so the
  // browser can display it and verify-otp accepts the same value.
  if (!supabaseConfigured() || process.env.DEMO_MODE === "true") {
    const code = process.env.DEMO_OTP || "123456";
    return corsResponse({ ok: true, demo: true, devCode: code, expiresIn: 300 });
  }

  try {
    // simple rate limit: max 5 OTP requests per target per 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await supabaseRest(
      `otp_requests?target=eq.${encodeURIComponent(target)}&created_at=gt.${since}&select=id`
    );
    if (Array.isArray(recent) && recent.length >= 5) {
      return corsResponse({ error: "অনেকবার চেষ্টা হয়েছে — ১০ মিনিট পর আবার চেষ্টা করুন" }, 429);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabaseRest("otp_requests", {
      method: "POST",
      body: {
        channel,
        target,
        code_hash: hashToken(code, target),
        expires_at: expiresAt,
        consumed: false,
        attempts: 0,
      },
    });

    if (channel === "mobile") await sendSmsWebhook(target, code);
    // For email OTP use Supabase Auth's built-in signInWithOtp on the client;
    // this table-based path is primarily for mobile numbers.

    return corsResponse({ ok: true, demo: false, expiresIn: 300 });
  } catch (err) {
    console.error("send-otp error:", err);
    return corsResponse({ error: "OTP পাঠানো যায়নি", detail: err.message }, 500);
  }
};
