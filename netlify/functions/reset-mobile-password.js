/* ============================================================
 * reset-mobile-password.js
 * Verifies the OTP one last time and sets a new password on the
 * synthetic auth account that backs a mobile-only registration.
 *
 * Body: { cc: "+88", mobile: "017...", token: "123456",
 *         newPassword: "..." }
 * ============================================================ */
const { corsResponse, readBody, hashToken, supabaseConfigured, supabaseRest } = require("./lib/otp");

function syntheticEmail(cc, mobile) {
  const ccDigits = cc.replace(/\D/g, "");
  let digits = mobile.replace(/\D/g, "");
  if (ccDigits === "880" || ccDigits === "88") {
    digits = digits.startsWith("0") ? "880" + digits.slice(1) : "880" + digits;
  }
  return `${digits}@${process.env.SYNTHETIC_EMAIL_DOMAIN || "phone.mygov-demo.app"}`;
}

async function adminFindUserByEmail(email) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&limit=200`,
    { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
  );
  if (!res.ok) throw new Error(`admin users ${res.status}`);
  const data = await res.json();
  const users = data.users || data || [];
  return users.find((u) => u.email === email) || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse({ ok: true });
  if (event.httpMethod !== "POST") return corsResponse({ error: "Method not allowed" }, 405);
  if (!supabaseConfigured()) return corsResponse({ ok: false, error: "Supabase env নেই — ক্লায়েন্ট ডেমো মোড ব্যবহার করুন" }, 503);

  const { cc = "+88", mobile, token, newPassword } = readBody(event);
  if (!mobile || !token || !newPassword) {
    return corsResponse({ ok: false, error: "mobile, token ও newPassword আবশ্যক" }, 400);
  }
  if (String(newPassword).length < 8) {
    return corsResponse({ ok: false, error: "পাসওয়ার্ড ন্যূনতম ৮ অক্ষরের হতে হবে" }, 400);
  }

  try {
    const target = `${cc} ${mobile}`;
    const rows = await supabaseRest(
      `otp_requests?target=eq.${encodeURIComponent(target)}&consumed=eq.false&order=created_at.desc&limit=1&select=*`
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return corsResponse({ ok: false, error: "OTP মেয়াদ শেষ বা পাওয়া যায়নি" }, 400);
    }
    if (row.code_hash !== hashToken(String(token).trim(), target)) {
      return corsResponse({ ok: false, error: "OTP সঠিক নয়" }, 400);
    }

    const email = syntheticEmail(cc, mobile);
    const authUser = await adminFindUserByEmail(email);
    if (!authUser) return corsResponse({ ok: false, error: "এই মোবাইলে কোনো একাউন্ট নেই" }, 404);

    const updateRes = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/admin/users/${authUser.id}/password`,
      {
        method: "PUT",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      }
    );
    if (!updateRes.ok) throw new Error(`admin password update ${updateRes.status}`);

    await supabaseRest(`otp_requests?id=eq.${row.id}`, { method: "PATCH", body: { consumed: true } });
    return corsResponse({ ok: true });
  } catch (err) {
    console.error("reset-mobile-password error:", err);
    return corsResponse({ ok: false, error: "পাসওয়ার্ড রিসেট ব্যর্থ", detail: err.message }, 500);
  }
};
