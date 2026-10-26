/* ============================================================
 * backend.js — data/auth abstraction
 *
 * Two interchangeable backends behind one API:
 *   1. SupabaseBackend  — real Postgres + Auth (when keys configured)
 *   2. DemoBackend      — localStorage, OTP shown on screen
 *
 * Public API (all async unless noted):
 *   currentUser()  logout()  login({identifier,password})
 *   requestOtp({channel,target,name,cc})  verifyOtp({channel,target,token})
 *   completeRegistration({name,cc,mobile,email,channel,password})
 *   resetPasswordByOtp({channel,target,token,password})
 *   updateProfile(patch)  applyService(service)
 *   listApplications()   trackApplication({mobile,trackingNo})
 * ============================================================ */

const SYN_DOMAIN = (window.MYGOV_CONFIG?.SYNTHETIC_EMAIL_DOMAIN) || "phone.mygov-demo.app";

function syntheticEmail(mobileDigits) {
  return `${mobileDigits}@${SYN_DOMAIN}`;
}
function genTrackingNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `BD-${ymd}-${Math.floor(100000 + Math.random() * 900000)}`;
}

/* =====================================================================
 *  DEMO BACKEND — everything lives in localStorage
 * ===================================================================== */
const DemoBackend = {
  key: "mygov_demo_db_v1",
  sessionKey: "mygov_demo_session_v1",

  _read() {
    try { return JSON.parse(localStorage.getItem(this.key)) || { users: [], applications: [] }; }
    catch { return { users: [], applications: [] }; }
  },
  _write(db) { localStorage.setItem(this.key, JSON.stringify(db)); },
  _user() {
    const id = localStorage.getItem(this.sessionKey);
    return id ? this._read().users.find((u) => u.id === id) || null : null;
  },

  async currentUser() {
    const u = this._user();
    return u ? { ...u, password: undefined } : null;
  },

  async logout() { localStorage.removeItem(this.sessionKey); },

  async requestOtp({ channel, target }) {
    // demo OTP is fixed and shown on screen by the registration UI
    return { demo: true, devCode: window.MYGOV_CONFIG.DEMO_OTP || "123456", target, channel };
  },

  async verifyOtp({ token }) {
    const ok = String(token).trim() === (window.MYGOV_CONFIG.DEMO_OTP || "123456");
    if (!ok) throw new Error("OTP সঠিক নয় (ডেমো কোড: ১২৩৪৫৬)");
    return true;
  },

  async completeRegistration({ name, cc, mobile, email, channel, password }) {
    const db = this._read();
    const mobileDigits = mobile ? normalizeMobile(mobile, cc) : null;
    if (mobile && db.users.some((u) => u.mobileDigits === mobileDigits)) {
      throw new Error("এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে — লগইন করুন।");
    }
    if (email && db.users.some((u) => (u.email || "").toLowerCase() === email.toLowerCase())) {
      throw new Error("এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে।");
    }
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user = {
      id,
      full_name: name,
      email: channel === "email" ? email : null,
      mobile: mobile ? `${cc} ${mobile}` : null,
      mobileDigits,
      channel,
      password, // demo only — never store plaintext in a real system
      verified: true,
      profile: { nid: "", birth_date: "", gender: "", division: "", district: "", address: "", photo: "" },
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    this._write(db);
    localStorage.setItem(this.sessionKey, id);
    return { ...user, password: undefined };
  },

  async login({ identifier, password }) {
    const db = this._read();
    const id = identifier.trim().toLowerCase();
    const isEmail = id.includes("@");
    const digits = identifier.replace(/\D/g, "").replace(/^0/, "");
    const user = db.users.find((u) => {
      if (isEmail) return u.email && u.email.toLowerCase() === id;
      return (
        u.mobileDigits &&
        (u.mobileDigits === normalizeMobile(identifier) ||
          (digits.length >= 10 && u.mobileDigits.endsWith(digits)))
      );
    });
    if (!user) throw new Error("কোনো অ্যাকাউন্ট পাওয়া যায়নি। আগে রেজিস্ট্রেশন করুন।");
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
    const db = this._read();
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

  async applyService(service) {
    const db = this._read();
    const u = this._user();
    if (!u) throw new Error("লগইন প্রয়োজন");
    const app = {
      id: crypto.randomUUID(),
      user_id: u.id,
      tracking_no: genTrackingNo(),
      service_name: service.name,
      service_sector: service.sector,
      office: service.office || "সংশ্লিষ্ট দপ্তর",
      fee: service.fee || "—",
      status: "submitted",
      created_at: new Date().toISOString(),
      timeline: [
        { status: "submitted", label: "আবেদন জমা হয়েছে", date: new Date().toISOString() },
        { status: "processing", label: "দপ্তরে প্রক্রিয়াধীন", date: null },
        { status: "delivered", label: "সেবা বিতরণ হয়েছে", date: null },
      ],
    };
    db.applications.push(app);
    this._write(db);
    return app;
  },

  async listApplications() {
    const u = this._user();
    if (!u) return [];
    return this._read().applications.filter((a) => a.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async trackApplication({ mobile, trackingNo }) {
    const db = this._read();
    const digits = normalizeMobile(mobile);
    const owner = db.users.find((u) => u.mobileDigits === digits);
    const app = db.applications.find(
      (a) => a.tracking_no.toLowerCase() === trackingNo.trim().toLowerCase() && (!owner || a.user_id === owner.id)
    );
    if (app) return app;
    // built-in demo records so the page is testable without an account
    const SAMPLE = [
      {
        tracking_no: "BD-DEMO-1001",
        service_name: "বিদেশগামী নাগরিকদের সার্টিফিকেট সত্যায়ন",
        office: "পররাষ্ট্র মন্ত্রণালয়",
        status: "processing",
        applicant_mobile: "8801700000000",
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        timeline: [
          { status: "submitted", label: "আবেদন জমা হয়েছে", date: new Date(Date.now() - 3 * 86400000).toISOString() },
          { status: "processing", label: "দপ্তরে প্রক্রিয়াধীন", date: new Date(Date.now() - 1 * 86400000).toISOString() },
          { status: "delivered", label: "সেবা বিতরণ হয়েছে", date: null },
        ],
      },
      {
        tracking_no: "BD-DEMO-1002",
        service_name: "জন্ম নিবন্ধন সনদ সংশোধন",
        office: "স্থানীয় সরকার বিভাগ",
        status: "delivered",
        applicant_mobile: "8801700000000",
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        timeline: [
          { status: "submitted", label: "আবেদন জমা হয়েছে", date: new Date(Date.now() - 8 * 86400000).toISOString() },
          { status: "processing", label: "দপ্তরে প্রক্রিয়াধীন", date: new Date(Date.now() - 6 * 86400000).toISOString() },
          { status: "delivered", label: "সেবা বিতরণ হয়েছে", date: new Date(Date.now() - 4 * 86400000).toISOString() },
        ],
      },
    ];
    const found = SAMPLE.find((s) => s.tracking_no.toLowerCase() === trackingNo.trim().toLowerCase());
    if (found) return found;
    throw new Error("এই তথ্য দিয়ে কোনো আবেদন পাওয়া যায়নি। ডেমo নম্বর: BD-DEMO-1001");
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
      .from("profiles")
      .select("*")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (profile) return profile;
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async requestOtp({ channel, target, name, cc }) {
    if (channel === "email") {
      // Supabase sends a 6-digit email OTP (template must use {{ .Token }})
      const { error } = await supabase.auth.signInWithOtp({ email: target });
      if (error) throw new Error(error.message);
      return { demo: false };
    }
    // mobile: Netlify function stores a hashed OTP; if the function is
    // missing (static-only deploy) it falls back to an on-screen demo code.
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
        id: userId,
        full_name: name,
        email,
        mobile: mobile ? `${cc} ${mobile}` : null,
        mobile_digits: mobile ? normalizeMobile(mobile, cc) : null,
        channel,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (pErr) throw new Error(pErr.message);
      return this.currentUser();
    }

    // mobile: create auth user with synthetic email
    const digits = normalizeMobile(mobile, cc);
    const { data: taken } = await supabase.rpc("identifier_taken", { p_mobile: digits, p_email: null });
    if (taken?.mobile) throw new Error("এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে — লগইন করুন।");

    const { data, error } = await supabase.auth.signUp({
      email: syntheticEmail(digits),
      password,
      options: { data: { full_name: name, mobile: `${cc} ${mobile}`, channel: "mobile" } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("রেজিস্ট্রেশন ব্যর্থ হয়েছে।");
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: name,
      email: null,
      mobile: `${cc} ${mobile}`,
      mobile_digits: digits,
      channel: "mobile",
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
    // mobile: service-role function updates the synthetic auth user's password
    const digits = normalizeMobile(mobile, cc);
    const result = await this._callFunction("RESET_MOBILE_PASSWORD", {
      email: syntheticEmail(digits),
      newPassword: password,
      token: String(token).trim(),
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
    if (patch.full_name) {
      await supabase.auth.updateUser({ data: { full_name: patch.full_name } });
    }
    return this.currentUser();
  },

  async applyService(service) {
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
    };
    const { data, error } = await supabase.from("applications").insert(row).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listApplications() {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return [];
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", s.session.user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async trackApplication({ mobile, trackingNo }) {
    const { data, error } = await supabase.rpc("track_application", {
      p_mobile: normalizeMobile(mobile),
      p_tracking: trackingNo.trim(),
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("এই তথ্য দিয়ে কোনো আবেদন পাওয়া যায়নি।");
    return data;
  },
};

window.MyGovBackend = window.MYGOV_DEMO_MODE ? DemoBackend : SupabaseBackend;
window.MyGovBackend.isDemo = !!window.MYGOV_DEMO_MODE;
