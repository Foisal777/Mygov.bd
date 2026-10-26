/* ============================================================
 * verify-otp.js — validates a 6-digit OTP against the latest
 * unconsumed otp_requests row.
 *
 * Body: { target: string, token: string }
 * ============================================================ */
const {
  corsResponse,
  readBody,
  hashToken,
  supabaseConfigured,
  supabaseRest,
} = require("./lib/otp");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse({ ok: true });
  if (event.httpMethod !== "POST") return corsResponse({ error: "Method not allowed" }, 405);

  const { target, token } = readBody(event);
  if (!target || !token) return corsResponse({ error: "target ও token আবশ্যক" }, 400);

  if (!supabaseConfigured() || process.env.DEMO_MODE === "true") {
    // Function-level demo: accept the env-defined demo code or 123456
    const ok = String(token).trim() === (process.env.DEMO_OTP || "123456");
    return ok ? corsResponse({ ok: true, demo: true }) : corsResponse({ ok: false, error: "ভুল OTP" }, 400);
  }

  try {
    const rows = await supabaseRest(
      `otp_requests?target=eq.${encodeURIComponent(target)}&consumed=eq.false&order=created_at.desc&limit=1&select=*`
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return corsResponse({ ok: false, error: "কোনো সক্রিয় OTP পাওয়া যায়নি — নতুন OTP পাঠান" }, 400);

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return corsResponse({ ok: false, error: "OTP এর মেয়াদ শেষ — নতুন OTP পাঠান" }, 400);
    }
    if ((row.attempts || 0) >= 5) {
      return corsResponse({ ok: false, error: "সর্বোচ্চ চেষ্টা শেষ — নতুন OTP পাঠান" }, 429);
    }

    const expected = hashToken(String(token).trim(), target);
    if (expected !== row.code_hash) {
      await supabaseRest(`otp_requests?id=eq.${row.id}`, {
        method: "PATCH",
        body: { attempts: (row.attempts || 0) + 1 },
      });
      return corsResponse({ ok: false, error: "OTP সঠিক নয়" }, 400);
    }

    await supabaseRest(`otp_requests?id=eq.${row.id}`, {
      method: "PATCH",
      body: { consumed: true },
    });
    return corsResponse({ ok: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    return corsResponse({ ok: false, error: "যাচাই ব্যর্থ", detail: err.message }, 500);
  }
};
