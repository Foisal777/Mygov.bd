/* ============================================================
 * admin-api.js — single endpoint powering the admin panel
 *
 * Auth: POST {action:"login", username, password} → HMAC token.
 *       Every other request sends Authorization: Bearer <token>.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required)
 *   ADMIN_EMAIL, ADMIN_PASSWORD              (admin credentials)
 *   ADMIN_SECRET                             (token signing secret;
 *                                              defaults to service key)
 *   DEMO_MODE=true                           (accept the documented demo
 *                                              credentials if env unset)
 * ============================================================ */
const crypto = require("node:crypto");
const { corsResponse, readBody, supabaseConfigured, supabaseRest } = require("./lib/otp");

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const STATUS_ORDER = ["submitted", "processing", "approved", "delivered"];
const STATUS_LABELS = {
  submitted: "জমা হয়েছে", processing: "দপ্তরে প্রক্রিয়াধীন",
  approved: "অনুমোদিত হয়েছে", delivered: "সেবা বিতরণ হয়েছে",
};

function secret() {
  return process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "insecure-demo-secret";
}
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function sign(payload) {
  const body = b64url(payload);
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const valid = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp < Date.now()) return null;
  return payload;
}
function adminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || "admin@mygov-demo.app").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || (process.env.DEMO_MODE === "true" ? "Admin@123" : null),
  };
}
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function buildTimeline(status, createdAt) {
  const idx = status === "rejected" ? 1 : STATUS_ORDER.indexOf(status);
  return STATUS_ORDER.map((s, i) => ({
    status: s,
    label: STATUS_LABELS[s],
    date: i === 0 ? createdAt : i <= idx ? daysAgo(Math.max(0, idx - i)) : null,
  }));
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return corsResponse({ ok: true });
  if (event.httpMethod !== "POST") return corsResponse({ ok: false, error: "Method not allowed" }, 405);
  if (!supabaseConfigured()) {
    return corsResponse({ ok: false, error: "Supabase env নেই — ডেমো মোডে ব্রাউজার-ভিত্তিক অ্যাডমিন ব্যবহার করুন" }, 503);
  }

  const { action, payload = {} } = readBody(event);

  try {
    /* ---------------- auth ---------------- */
    if (action === "login") {
      const cred = adminCredentials();
      if (!cred.password) {
        return corsResponse({ ok: false, error: "Netlify-তে ADMIN_PASSWORD env ভেরিয়েবল সেট করুন" }, 503);
      }
      const username = String(payload.username || "").trim().toLowerCase();
      const okUser = username === cred.email || username === "admin";
      const okPass = payload.password === cred.password;
      if (!okUser || !okPass) return corsResponse({ ok: false, error: "অ্যাডমিন আইডি বা পাসওয়ার্ড ভুল" }, 401);
      const profile = { role: "admin", email: cred.email, full_name: "অ্যাডমিন" };
      const token = sign({ ...profile, exp: Date.now() + TOKEN_TTL_MS });
      return corsResponse({ ok: true, data: { token, profile } });
    }

    const auth = verify((event.headers.authorization || "").replace("Bearer ", ""));
    if (!auth) return corsResponse({ ok: false, error: "Unauthorized" }, 401);

    /* ---------------- stats ---------------- */
    if (action === "me") {
      return corsResponse({ ok: true, data: { role: "admin", email: auth.email, full_name: auth.full_name } });
    }

    if (action === "stats") {
      const [profiles, apps, services] = await Promise.all([
        supabaseRest("profiles?select=id,is_verified,blocked"),
        supabaseRest("applications?select=id,status"),
        supabaseRest("services?select=id,active"),
      ]);
      const processing = apps.filter((a) => ["submitted", "processing"].includes(a.status)).length;
      const delivered = apps.filter((a) => ["approved", "delivered"].includes(a.status)).length;
      const recent = await supabaseRest("applications?select=*&order=created_at.desc&limit=5");
      return corsResponse({
        ok: true,
        data: {
          users: profiles.length,
          verified: profiles.filter((p) => p.is_verified).length,
          blocked: profiles.filter((p) => p.blocked).length,
          applications: apps.length,
          processing, delivered,
          services: services.filter((s) => s.active !== false).length,
          recentApplications: recent,
        },
      });
    }

    /* ---------------- users ---------------- */
    if (action === "listUsers") {
      const q = (payload.q || "").trim().toLowerCase();
      let rows = await supabaseRest("profiles?select=*&order=created_at.desc");
      if (q) {
        rows = rows.filter((u) =>
          [u.full_name, u.email, u.mobile, u.mobile_digits, u.nid]
            .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
        );
      }
      return corsResponse({ ok: true, data: rows });
    }

    if (action === "updateUser") {
      const { id, patch } = payload;
      const allowed = {};
      if (typeof patch.is_verified === "boolean") allowed.is_verified = patch.is_verified;
      if (typeof patch.blocked === "boolean") allowed.blocked = patch.blocked;
      if (patch.full_name) allowed.full_name = patch.full_name;
      allowed.updated_at = new Date().toISOString();
      const data = await supabaseRest(`profiles?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: allowed });
      return corsResponse({ ok: true, data });
    }

    /* ---------------- applications ---------------- */
    if (action === "listApplications") {
      const apps = await supabaseRest("applications?select=*&order=created_at.desc");
      const profiles = await supabaseRest("profiles?select=id,full_name,mobile,mobile_digits");
      const ownerOf = Object.fromEntries(profiles.map((p) => [p.id, p]));
      let rows = apps.map((a) => ({
        ...a,
        applicant_name: ownerOf[a.user_id]?.full_name || "—",
        applicant_mobile: ownerOf[a.user_id]?.mobile || (ownerOf[a.user_id]?.mobile_digits ? `+${ownerOf[a.user_id].mobile_digits}` : "—"),
      }));
      const status = payload.status || "";
      const q = (payload.q || "").trim().toLowerCase();
      if (status) rows = rows.filter((a) => a.status === status);
      if (q) {
        rows = rows.filter((a) =>
          [a.tracking_no, a.service_name, a.applicant_name, a.applicant_mobile, a.office,
            JSON.stringify(a.form_data || {})]
            .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
        );
      }
      return corsResponse({ ok: true, data: rows });
    }

    if (action === "updateApplication") {
      const { id, patch } = payload;
      const body = { updated_at: new Date().toISOString() };
      if (patch.status) {
        body.status = patch.status;
        body.timeline = buildTimeline(patch.status, new Date().toISOString());
      }
      if (typeof patch.admin_note === "string") body.admin_note = patch.admin_note;
      const data = await supabaseRest(`applications?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body });
      return corsResponse({ ok: true, data });
    }

    /* ---------------- services ---------------- */
    if (action === "listServices") {
      const data = await supabaseRest("services?select=*&order=sort.asc");
      return corsResponse({ ok: true, data });
    }
    if (action === "upsertService") {
      const s = payload.service || {};
      if (!s.id) s.id = `srv-cust-${Date.now()}`;
      const data = await supabaseRest("services", {
        method: "POST",
        body: { ...s, docs: s.docs || [], active: s.active !== false },
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      });
      return corsResponse({ ok: true, data });
    }
    if (action === "deleteService") {
      await supabaseRest(`services?id=eq.${encodeURIComponent(payload.id)}`, { method: "DELETE" });
      return corsResponse({ ok: true, data: true });
    }

    return corsResponse({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("admin-api error:", err);
    return corsResponse({ ok: false, error: err.message || "Admin request failed" }, 500);
  }
};
