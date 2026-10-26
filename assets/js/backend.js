/* ============================================================
 * backend.js — data/auth/admin abstraction
 *
 * Two interchangeable backends behind one API:
 *   1. SupabaseBackend  — real Postgres + Auth + admin Netlify Function
 *   2. DemoBackend      — localStorage, OTP shown on screen, seeded
 *                         training data + built-in demo admin
 *
 * Citizen API:
 *   currentUser()  logout()  login({identifier,password})
 *   requestOtp()  verifyOtp()  completeRegistration()
 *   resetPasswordByOtp()  updatePassword()  updateProfile()
 *   listServices()  applyService(service, formData)
 *   listApplications()  trackApplication()
 *
 * Admin API:
 *   adminLogin({username,password})  adminCurrent()  adminLogout()
 *   adminStats()  adminListUsers()  adminUpdateUser(id,patch)
 *   adminListApplications(filters)  adminUpdateApplication(id,patch)
 *   adminUpsertService(service)  adminDeleteService(id)
 * ============================================================ */

const SYN_DOMAIN = (window.MYGOV_CONFIG?.SYNTHETIC_EMAIL_DOMAIN) || "phone.mygov-demo.app";
const DEMO_ADMIN = { email: "admin@mygov-demo.app", password: "Admin@123", name: "অ্যাডমিন (ডেমো)" };
const APP_STATUSES = ["submitted", "processing", "approved", "delivered", "rejected"];
const STATUS_LABELS_BN = {
  submitted: "জমা হয়েছে", processing: "প্রক্রিয়াধীন", approved: "অনুমোদিত",
  delivered: "বিতরণ হয়েছে", rejected: "বাতিল",
};

function syntheticEmail(mobileDigits) {
  return `${mobileDigits}@${SYN_DOMAIN}`;
}
function genTrackingNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `BD-${ymd}-${Math.floor(100000 + Math.random() * 900000)}`;
}
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function buildTimeline(status, createdAt) {
  const order = ["submitted", "processing", "approved", "delivered"];
  const labels = {
    submitted: "আবেদন জমা হয়েছে", processing: "দপ্তরে প্রক্রিয়াধীন",
    approved: "অনুমোদিত হয়েছে", delivered: "সেবা বিতরণ হয়েছে",
  };
  const idx = status === "rejected" ? 1 : order.indexOf(status);
  return order.map((s, i) => ({
    status: s,
    label: labels[s],
    date: i === 0 ? createdAt : i <= idx ? daysAgo(Math.max(0, idx - i)) : null,
  }));
}

/* =====================================================================
 *  DEMO BACKEND — everything lives in localStorage
 * ===================================================================== */
const DemoBackend = {
  key: "mygov_demo_db_v1",
  sessionKey: "mygov_demo_session_v1",
  adminSessionKey: "mygov_demo_admin_session_v1",

  _read() {
    let db;
    try { db = JSON.parse(localStorage.getItem(this.key)); } catch { db = null; }
    if (!db || typeof db !== "object") db = {};
    db.users = db.users || [];
    db.applications = db.applications || [];
    db.services = db.services || [];
    return db;
  },
  _write(db) { localStorage.setItem(this.key, JSON.stringify(db)); },
  _user() {
    const id = localStorage.getItem(this.sessionKey);
    return id ? this._read().users.find((u) => u.id === id) || null : null;
  },

  /* Seed an admin, sample citizens, applications and the service catalogue
   * so training sessions start with realistic data. Idempotent. */
  ensureSeed() {
    const db = this._read();
    let changed = false;

    if (!db.services.length && typeof FALLBACK_SERVICES !== "undefined") {
      db.services = clone(FALLBACK_SERVICES);
      changed = true;
    }
    if (!db.users.some((u) => u.role === "admin")) {
      db.users.push({
        id: "demo-admin-001", role: "admin", full_name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email, password: DEMO_ADMIN.password,
        channel: "email", verified: true, is_verified: true, blocked: false,
        profile: {}, created_at: daysAgo(60),
      });
      changed = true;
    }
    const citizens = db.users.filter((u) => u.role !== "admin");
    if (!citizens.length && !db.samples_added) {
      db.samples_added = true;
      db.users.push(
        {
          id: "demo-user-001", role: "citizen", full_name: "Karim Uddin",
          email: "karim@example.com", mobile: "+88 01812345678", mobileDigits: "8801812345678",
          password: "Secret@123", channel: "mobile", verified: true, is_verified: true, blocked: false,
          nid: "1990123456789", gender: "male", division: "ঢাকা", district: "ঢাকা",
          profile: { nid: "1990123456789", verified: true, documents: [{ type: "nid", name: "nid-karim.pdf" }] },
          created_at: daysAgo(40),
        },
        {
          id: "demo-user-002", role: "citizen", full_name: "Rahima Begum",
          email: "rahima@example.com", mobile: "+88 01912345678", mobileDigits: "8801912345678",
          password: "Secret@123", channel: "mobile", verified: true, is_verified: false, blocked: false,
          gender: "female", division: "চট্টগ্রাম", district: "কুমিল্লা",
          profile: { documents: [] }, created_at: daysAgo(20),
        }
      );
      const samityService = db.services.find((s) => s.form === "samity") || { name: "নতুন সমবায় সমিতি রেজিস্ট্রেশন", sector: "নিবন্ধন ও লাইসেন্স", office: "সমবায় অধিদপ্তর", fee: "৳ ১,০০০" };
      db.applications.push(
        {
          id: "demo-app-001", user_id: "demo-user-001", tracking_no: "BD-DEMO-2001",
          service_name: samityService.name, service_sector: samityService.sector,
          office: samityService.office, fee: samityService.fee, status: "processing",
          form_data: {
            samity_name: "কল্যাণ বহুমুখী সমবায় সমিতি লিমিটেড", samity_type: "বহুমুখী সমবায় সমিতি",
            district: "ঢাকা", upazila: "সাভার", member_count: "২১", formation_date: "2026-09-15",
            chairman_name: "Karim Uddin", secretary_name: "Jamal Hossain", secretary_mobile: "01812345678",
            objective: "সদস্যদের আর্থ-সামাজিক উন্নয়ন ও সম্মিলিত বিনিয়োগ।",
          },
          admin_note: "", created_at: daysAgo(6), updated_at: daysAgo(2),
          timeline: buildTimeline("processing", daysAgo(6)),
        },
        {
          id: "demo-app-002", user_id: "demo-user-001", tracking_no: "BD-DEMO-2002",
          service_name: "ট্রেড লাইসেন্স (নতুন / নবায়ন)", service_sector: "নিবন্ধন ও লাইসেন্স",
          office: "সিটি কর্পোরেশন / পৌরসভা", fee: "৳ ১,০০০ – ৫,০০০", status: "delivered",
          form_data: { purpose: "নতুন হার্ডওয়্যার ব্যবসার ট্রেড লাইসেন্স" },
          admin_note: "লাইসেন্স ইস্যু করা হয়েছে", created_at: daysAgo(15), updated_at: daysAgo(9),
          timeline: buildTimeline("delivered", daysAgo(15)),
        },
        {
          id: "demo-app-003", user_id: "demo-user-002", tracking_no: "BD-DEMO-2003",
          service_name: "জন্ম নিবন্ধন সনদের জন্য আবেদন", service_sector: "সনদ, প্রত্যয়ন, অনাপত্তি ও অনুমতি",
          office: "স্থানীয় সরকার বিভাগ", fee: "বিনামূল্যে", status: "submitted",
          form_data: { purpose: "নবজাতকের জন্ম নিবন্ধন" }, admin_note: "",
          created_at: daysAgo(1), updated_at: daysAgo(1),
          timeline: buildTimeline("submitted", daysAgo(1)),
        }
      );
      changed = true;
    }
    if (changed) this._write(db);
    return db;
  },

  /* ---------------- citizen auth ---------------- */
  async currentUser() {
    this.ensureSeed();
    const u = this._user();
    return u ? { ...u, password: undefined } : null;
  },
  async logout() { localStorage.removeItem(this.sessionKey); },

  async requestOtp({ channel, target }) {
    this.ensureSeed();
    return { demo: true, devCode: window.MYGOV_CONFIG.DEMO_OTP || "123456", target, channel };
  },
  async verifyOtp({ token }) {
    const ok = String(token).trim() === (window.MYGOV_CONFIG.DEMO_OTP || "123456");
    if (!ok) throw new Error("OTP সঠিক নয় (ডেমো কোড: ১২৩৪৫৬)");
    return true;
  },

  async completeRegistration({ name, cc, mobile, email, channel, password }) {
    const db = this.ensureSeed();
    const mobileDigits = mobile ? normalizeMobile(mobile, cc) : null;
    if (mobile && db.users.some((u) => u.mobileDigits === mobileDigits)) {
      throw new Error("এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে — লগইন করুন।");
    }
    if (email && db.users.some((u) => (u.email || "").toLowerCase() === email.toLowerCase())) {
      throw new Error("এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে।");
    }
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user = {
      id, role: "citizen",
      full_name: name,
      email: channel === "email" ? email : null,
      mobile: mobile ? `${cc} ${mobile}` : null,
      mobileDigits, channel, password,
      verified: true, is_verified: false, blocked: false,
      profile: { nid: "", birth_date: "", gender: "", division: "", district: "", address: "", photo: "", documents: [] },
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    this._write(db);
    localStorage.setItem(this.sessionKey, id);
    return { ...user, password: undefined };
  },

  async login({ identifier, password }) {
    const db = this.ensureSeed();
    const id = identifier.trim().toLowerCase();
    const isEmail = id.includes("@");
    const digits = identifier.replace(/\D/g, "").replace(/^0/, "");
    const user = db.users.find((u) => {
      if (u.role === "admin") return false;
      if (isEmail) return u.email && u.email.toLowerCase() === id;
      return (
        u.mobileDigits &&
        (u.mobileDigits === normalizeMobile(identifier) ||
          (digits.length >= 10 && u.mobileDigits.endsWith(digits)))
      );
    });
    if (!user) throw new Error("কোনো অ্যাকাউন্ট পাওয়া যায়নি। আগে রেজিস্ট্রেশন করুন।");
    if (user.blocked) throw new Error("আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে — সহায়তায় যোগাযোগ করুন।");
    if (user.password !== password) throw new Error("পাসওয়ার্ড ভুল হয়েছে।");
    localStorage.setItem(this.sessionKey, user.id);
    return { ...user, password: undefined };
  },

  async updatePassword(password) {
    const db = this._read();
    const id = localStorage.getItem(this.sessionKey);
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("লগইন প্রয়োজন");
    u.password = password;
    this._write(db);
    return true;
  },
  async resetPasswordByOtp({ identifier, password }) {
    const db = this.ensureSeed();
    const id = identifier.trim().toLowerCase();
    const isEmail = id.includes("@");
    const user = db.users.find((u) =>
      isEmail
        ? u.email && u.email.toLowerCase() === id
        : u.mobileDigits && u.mobileDigits === normalizeMobile(identifier)
    );
    if (!user) throw new Error("কোনো অ্যাকাউন্ট পাওয়া যায়নি।");
    user.password = password;
    this._write(db);
    return true;
  },

  async updateProfile(patch) {
    const db = this._read();
    const id = localStorage.getItem(this.sessionKey);
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("লগইন প্রয়োজন");
    const nested = patch.profile || {};
    delete patch.profile;
    Object.assign(u, patch);
    u.profile = { ...(u.profile || {}), ...nested };
    this._write(db);
    return { ...u, password: undefined };
  },

  /* ---------------- services & applications ---------------- */
  async listServices({ includeInactive = false } = {}) {
    const db = this.ensureSeed();
    const list = db.services.length ? db.services : (typeof FALLBACK_SERVICES !== "undefined" ? FALLBACK_SERVICES : []);
    return clone(list).filter((s) => includeInactive || s.active !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  },

  async applyService(service, formData = {}) {
    const db = this.ensureSeed();
    const u = this._user();
    if (!u) throw new Error("লগইন প্রয়োজন");
    const now = new Date().toISOString();
    const app = {
      id: crypto.randomUUID(),
      user_id: u.id,
      tracking_no: genTrackingNo(),
      service_name: service.name,
      service_sector: service.sector,
      office: service.office || "সংশ্লিষ্ট দপ্তর",
      fee: service.fee || "—",
      status: "submitted",
      form_data: formData,
      admin_note: "",
      created_at: now,
      updated_at: now,
      timeline: buildTimeline("submitted", now),
    };
    db.applications.push(app);
    this._write(db);
    return app;
  },

  async listApplications() {
    const u = this._user();
    if (!u) return [];
    return this._read().applications
      .filter((a) => a.user_id === u.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async trackApplication({ mobile, trackingNo }) {
    const db = this.ensureSeed();
    const digits = normalizeMobile(mobile);
    const owner = db.users.find((u) => u.mobileDigits === digits);
    const app = db.applications.find(
      (a) => a.tracking_no.toLowerCase() === trackingNo.trim().toLowerCase() && (!owner || a.user_id === owner.id)
    );
    if (app) return clone(app);
    const SAMPLE = [
      {
        tracking_no: "BD-DEMO-1001", service_name: "বিদেশগামী নাগরিকদের সার্টিফিকেট সত্যায়ন",
        office: "পররাষ্ট্র মন্ত্রণালয়", status: "processing", applicant_mobile: "8801700000000",
        created_at: daysAgo(3), timeline: buildTimeline("processing", daysAgo(3)),
      },
      {
        tracking_no: "BD-DEMO-1002", service_name: "জন্ম নিবন্ধন সনদ সংশোধন",
        office: "স্থানীয় সরকার বিভাগ", status: "delivered", applicant_mobile: "8801700000000",
        created_at: daysAgo(8), timeline: buildTimeline("delivered", daysAgo(8)),
      },
    ];
    const found = SAMPLE.find((s) => s.tracking_no.toLowerCase() === trackingNo.trim().toLowerCase());
    if (found) return found;
    throw new Error("এই তথ্য দিয়ে কোনো আবেদন পাওয়া যায়নি। ডেমো নম্বর: BD-DEMO-1001");
  },

  /* ---------------- admin ---------------- */
  async adminLogin({ username, password }) {
    const db = this.ensureSeed();
    const admin = db.users.find((u) => u.role === "admin");
    const okId = username.trim().toLowerCase() === admin.email.toLowerCase() || username.trim() === "admin";
    if (!okId || password !== admin.password) {
      throw new Error("অ্যাডমিন আইডি বা পাসওয়ার্ড ভুল হয়েছে।");
    }
    localStorage.setItem(this.adminSessionKey, admin.id);
    return { id: admin.id, full_name: admin.full_name, email: admin.email, role: "admin" };
  },
  async adminCurrent() {
    this.ensureSeed();
    const id = localStorage.getItem(this.adminSessionKey);
    if (!id) return null;
    const u = this._read().users.find((x) => x.id === id && x.role === "admin");
    return u ? { id: u.id, full_name: u.full_name, email: u.email, role: "admin" } : null;
  },
  async adminLogout() { localStorage.removeItem(this.adminSessionKey); },

  async adminStats() {
    const db = this.ensureSeed();
    const citizens = db.users.filter((u) => u.role !== "admin");
    return {
      users: citizens.length,
      verified: citizens.filter((u) => u.is_verified).length,
      blocked: citizens.filter((u) => u.blocked).length,
      applications: db.applications.length,
      processing: db.applications.filter((a) => ["submitted", "processing"].includes(a.status)).length,
      delivered: db.applications.filter((a) => ["approved", "delivered"].includes(a.status)).length,
      services: db.services.filter((s) => s.active !== false).length,
      recentApplications: clone(db.applications).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    };
  },
  async adminListUsers({ q = "" } = {}) {
    const db = this.ensureSeed();
    const term = q.trim().toLowerCase();
    return clone(db.users.filter((u) => u.role !== "admin"))
      .map((u) => ({ ...u, password: undefined }))
      .filter((u) =>
        !term ||
        [u.full_name, u.email, u.mobile, u.mobileDigits, u.nid].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async adminUpdateUser(id, patch) {
    const db = this._read();
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error("ইউজার পাওয়া যায়নি");
    if (typeof patch.is_verified === "boolean") {
      u.is_verified = patch.is_verified;
      u.profile = u.profile || {};
      u.profile.verified = patch.is_verified;
    }
    if (typeof patch.blocked === "boolean") u.blocked = patch.blocked;
    if (patch.full_name) u.full_name = patch.full_name;
    this._write(db);
    return { ...u, password: undefined };
  },
  async adminListApplications({ status = "", q = "" } = {}) {
    const db = this.ensureSeed();
    const term = q.trim().toLowerCase();
    return clone(db.applications)
      .map((a) => {
        const owner = db.users.find((u) => u.id === a.user_id);
        return { ...a, applicant_name: owner?.full_name || "—", applicant_mobile: owner?.mobile || "—" };
      })
      .filter((a) => (!status || a.status === status) &&
        (!term || [a.tracking_no, a.service_name, a.applicant_name, a.applicant_mobile, a.office,
          JSON.stringify(a.form_data || {})].some((v) => String(v).toLowerCase().includes(term))))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async adminUpdateApplication(id, patch) {
    const db = this._read();
    const app = db.applications.find((a) => a.id === id);
    if (!app) throw new Error("আবেদন পাওয়া যায়নি");
    if (patch.status && APP_STATUSES.includes(patch.status)) {
      app.status = patch.status;
      app.timeline = buildTimeline(patch.status, app.created_at);
    }
    if (typeof patch.admin_note === "string") app.admin_note = patch.admin_note;
    app.updated_at = new Date().toISOString();
    this._write(db);
    return clone(app);
  },
  async adminUpsertService(service) {
    const db = this.ensureSeed();
    const idx = db.services.findIndex((s) => s.id === service.id);
    const row = { ...service };
    if (idx >= 0) db.services[idx] = { ...db.services[idx], ...row };
    else {
      row.id = row.id || `srv-cust-${Date.now()}`;
      db.services.push(row);
    }
    this._write(db);
    return clone(row);
  },
  async adminDeleteService(id) {
    const db = this._read();
    db.services = db.services.filter((s) => s.id !== id);
    this._write(db);
    return true;
  },
};

/* =====================================================================
 *  SUPABASE BACKEND
 * ===================================================================== */
const SupabaseBackend = {
  async currentUser() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", data.session.user.id).maybeSingle();
    if (profile) {
      if (profile.blocked) { await supabase.auth.signOut(); throw new Error("আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে।"); }
      return profile;
    }
    return {
      id: data.session.user.id,
      full_name: data.session.user.user_metadata?.full_name || "নাগরিক",
      email: data.session.user.email,
      mobile: data.session.user.user_metadata?.mobile || "",
    };
  },
  async logout() { await supabase.auth.signOut(); },

  async _callFunction(name, body) {
    const base = window.MYGOV_CONFIG.FUNCTIONS[name];
    if (!base) throw new Error("FUNCTION_NOT_CONFIGURED");
    const res = await fetch(base, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async requestOtp({ channel, target, name, cc }) {
    if (channel === "email") {
      const { error } = await supabase.auth.signInWithOtp({ email: target });
      if (error) throw new Error(error.message);
      return { demo: false };
    }
    try {
      const result = await this._callFunction("SEND_OTP", { channel, target, name, cc });
      if (result.demo) return { demo: true, devCode: result.devCode };
      return { demo: false };
    } catch (e) {
      console.warn("[myGov] OTP function unavailable, using demo OTP:", e.message);
      return { demo: true, devCode: window.MYGOV_CONFIG.DEMO_OTP || "123456" };
    }
  },
  async verifyOtp({ channel, target, token }) {
    if (channel === "email") {
      const { error } = await supabase.auth.verifyOtp({ email: target, token: String(token).trim(), type: "email" });
      if (error) throw new Error("OTP সঠিক নয় বা মেয়াদ শেষ।");
      return true;
    }
    try {
      const result = await this._callFunction("VERIFY_OTP", { target, token: String(token).trim() });
      if (!result.ok) throw new Error(result.error || "OTP সঠিক নয়।");
      return true;
    } catch (e) {
      if (e.message === "FUNCTION_NOT_CONFIGURED" || e.message?.includes("Failed to fetch")) {
        if (String(token).trim() !== (window.MYGOV_CONFIG.DEMO_OTP || "123456")) throw new Error("OTP সঠিক নয়।");
        return true;
      }
      throw e;
    }
  },

  async completeRegistration({ name, cc, mobile, email, channel, password }) {
    if (channel === "email") {
      const { data: taken } = await supabase.rpc("identifier_taken", { p_mobile: null, p_email: email });
      if (taken?.email) throw new Error("এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে — লগইন করুন।");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("OTP যাচাই আগে সম্পন্ন করুন।");
      const userId = sessionData.session.user.id;
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw new Error(pwErr.message);
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: userId, full_name: name, email,
        mobile: mobile ? `${cc} ${mobile}` : null,
        mobile_digits: mobile ? normalizeMobile(mobile, cc) : null,
        channel, updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (pErr) throw new Error(pErr.message);
      return this.currentUser();
    }
    const digits = normalizeMobile(mobile, cc);
    const { data: taken } = await supabase.rpc("identifier_taken", { p_mobile: digits, p_email: null });
    if (taken?.mobile) throw new Error("এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে — লগইন করুন।");
    const { data, error } = await supabase.auth.signUp({
      email: syntheticEmail(digits), password,
      options: { data: { full_name: name, mobile: `${cc} ${mobile}`, channel: "mobile" } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("রেজিস্ট্রেশন ব্যর্থ হয়েছে।");
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: data.user.id, full_name: name, email: null,
      mobile: `${cc} ${mobile}`, mobile_digits: digits, channel: "mobile",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (pErr) throw new Error(pErr.message);
    return this.currentUser();
  },

  async login({ identifier, password }) {
    const isEmail = identifier.includes("@");
    const email = isEmail ? identifier.trim() : syntheticEmail(normalizeMobile(identifier));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("invalid login")) throw new Error("মোবাইল/ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।");
      throw new Error(error.message);
    }
    await this.currentUser(); // throws when blocked
    return this.currentUser();
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return true;
  },
  async resetPasswordByOtp({ channel, target, token, password, cc, mobile }) {
    if (channel === "email") {
      const { error } = await supabase.auth.verifyOtp({ email: target, token: String(token).trim(), type: "email" });
      if (error) throw new Error("OTP সঠিক নয় বা মেয়াদ শেষ।");
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw new Error(pwErr.message);
      return true;
    }
    const digits = normalizeMobile(mobile, cc);
    const result = await this._callFunction("RESET_MOBILE_PASSWORD", {
      email: syntheticEmail(digits), newPassword: password, token: String(token).trim(),
    });
    if (!result.ok) throw new Error(result.error || "পাসওয়ার্ড রিসেট ব্যর্থ।");
    return true;
  },

  async updateProfile(patch) {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw new Error("লগইন প্রয়োজন");
    const payload = { id: s.session.user.id, updated_at: new Date().toISOString(), ...patch };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    if (patch.full_name) await supabase.auth.updateUser({ data: { full_name: patch.full_name } });
    return this.currentUser();
  },

  async listServices({ includeInactive = false } = {}) {
    const { data, error } = await supabase
      .from("services").select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (error || !data || !data.length) {
      return clone(typeof FALLBACK_SERVICES !== "undefined" ? FALLBACK_SERVICES : [])
        .filter((s) => includeInactive || s.active !== false);
    }
    return data.filter((s) => includeInactive || s.active !== false);
  },

  async applyService(service, formData = {}) {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw new Error("লগইন প্রয়োজন");
    const row = {
      user_id: s.session.user.id,
      tracking_no: genTrackingNo(),
      service_name: service.name,
      service_sector: service.sector,
      office: service.office || "সংশ্লিষ্ট দপ্তর",
      fee: service.fee || null,
      status: "submitted",
      form_data: formData,
    };
    const { data, error } = await supabase.from("applications").insert(row).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async listApplications() {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return [];
    const { data, error } = await supabase
      .from("applications").select("*").eq("user_id", s.session.user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async trackApplication({ mobile, trackingNo }) {
    const { data, error } = await supabase.rpc("track_application", {
      p_mobile: normalizeMobile(mobile), p_tracking: trackingNo.trim(),
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("এই তথ্য দিয়ে কোনো আবেদন পাওয়া যায়নি।");
    return data;
  },

  /* ---------------- admin (via Netlify Function) ---------------- */
  _adminToken: () => localStorage.getItem("mygov_admin_token_v1"),
  async _adminCall(action, payload = {}) {
    const base = (window.MYGOV_CONFIG.FUNCTIONS || {}).ADMIN_API || "/.netlify/functions/admin-api";
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this._adminToken() || ""}` },
      body: JSON.stringify({ action, payload }),
    });
    const json = await res.json();
    if (!res.ok || json.ok === false) throw new Error(json.error || "Admin request failed");
    return json.data;
  },
  async adminLogin({ username, password }) {
    const data = await this._adminCall("login", { username, password });
    localStorage.setItem("mygov_admin_token_v1", data.token);
    localStorage.setItem("mygov_admin_profile_v1", JSON.stringify(data.profile));
    return data.profile;
  },
  async adminCurrent() {
    const token = this._adminToken();
    if (!token) return null;
    try {
      const profile = await this._adminCall("me");
      localStorage.setItem("mygov_admin_profile_v1", JSON.stringify(profile));
      return profile;
    } catch {
      localStorage.removeItem("mygov_admin_token_v1");
      localStorage.removeItem("mygov_admin_profile_v1");
      return null;
    }
  },
  async adminLogout() {
    localStorage.removeItem("mygov_admin_token_v1");
    localStorage.removeItem("mygov_admin_profile_v1");
  },
  adminStats() { return this._adminCall("stats"); },
  adminListUsers(p) { return this._adminCall("listUsers", p || {}); },
  adminUpdateUser(id, patch) { return this._adminCall("updateUser", { id, patch }); },
  adminListApplications(p) { return this._adminCall("listApplications", p || {}); },
  adminUpdateApplication(id, patch) { return this._adminCall("updateApplication", { id, patch }); },
  adminUpsertService(service) { return this._adminCall("upsertService", { service }); },
  adminDeleteService(id) { return this._adminCall("deleteService", { id }); },
};

window.MyGovBackend = window.MYGOV_DEMO_MODE ? DemoBackend : SupabaseBackend;
window.MyGovBackend.isDemo = !!window.MYGOV_DEMO_MODE;
window.MyGovBackend.APP_STATUSES = APP_STATUSES;
window.MyGovBackend.STATUS_LABELS = STATUS_LABELS_BN;
