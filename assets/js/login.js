/* ============================================================
 * login.js — citizen login (mobile or email + password)
 * ============================================================ */

let channel = "mobile";
const el = (id) => document.getElementById(id);

function setFieldError(input, message) {
  const field = input.closest(".field");
  field?.classList.toggle("invalid", !!message);
  const msg = field?.querySelector(".error-msg");
  if (msg && message) msg.textContent = message;
  input.classList.toggle("invalid", !!message);
}
function setLoading(btn, on, text) {
  if (on) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${text || "অপেক্ষা করুন…"}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.html || btn.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (MyGovBackend.isDemo) {
    el("demo-banner").hidden = false;
    el("mode-label").textContent = "· ডেমো মোড";
  } else {
    el("mode-label").textContent = "· Supabase";
  }

  // already logged in?
  MyGovBackend.currentUser().then((u) => {
    if (u) location.href = nextUrl();
  });

  $$(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      channel = btn.dataset.tab;
      $$(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      const input = el("identifier");
      input.value = "";
      input.closest(".field").classList.remove("invalid");
      if (channel === "mobile") {
        el("identifier-label").innerHTML = "মোবাইল নম্বর (ইংরেজিতে) <span class='req'>*</span>";
        el("identifier-hint").textContent = "রেজিস্ট্রেশন করা মোবাইল নম্বর লিখুন";
        input.placeholder = "01XXXXXXXXX";
        input.type = "tel";
        input.inputMode = "numeric";
      } else {
        el("identifier-label").innerHTML = "ইমেইল ঠিকানা <span class='req'>*</span>";
        el("identifier-hint").textContent = "রেজিস্ট্রেশন করা ইমেইল লিখুন";
        input.placeholder = "name@example.com";
        input.type = "email";
        input.inputMode = "email";
      }
    })
  );

  el("identifier").addEventListener("input", (e) => {
    if (channel === "mobile") e.target.value = e.target.value.replace(/[^\d]/g, "");
  });

  el("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const identifier = el("identifier");
    const password = el("password");
    let ok = true;
    if (!identifier.value.trim()) { setFieldError(identifier, "মোবাইল/ইমেইল লিখুন"); ok = false; }
    else if (channel === "mobile" && !isValidBdMobile(identifier.value)) {
      setFieldError(identifier, "সঠিক মোবাইল নম্বর লিখুন (যেমন: 01712345678)"); ok = false;
    } else if (channel === "email" && !isValidEmail(identifier.value.trim())) {
      setFieldError(identifier, "সঠিক ইমেইল লিখুন"); ok = false;
    }
    if (!password.value) { setFieldError(password, "পাসওয়ার্ড লিখুন"); ok = false; }
    if (!ok) return;

    const btn = el("btn-login");
    setLoading(btn, true, "লগইন হচ্ছে…");
    try {
      await MyGovBackend.login({ identifier: identifier.value, password: password.value });
      toast("লগইন সফল হয়েছে", "success");
      setTimeout(() => (location.href = nextUrl()), 500);
    } catch (err) {
      toast(err.message || "লগইন ব্যর্থ হয়েছে", "error", 6000);
    } finally {
      setLoading(btn, false);
    }
  });

  $$(".toggle-pw").forEach((b) =>
    b.addEventListener("click", () => {
      const input = el(b.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.textContent = show ? "লুকান" : "দেখুন";
    })
  );

  $$("[data-demo-link]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      toast(`${a.dataset.demoLink} এই ডেমোতে অন্তর্ভুক্ত নয়`, "info");
    })
  );
});

function nextUrl() {
  const p = new URLSearchParams(location.search).get("next");
  return p && /^[a-z0-9-]+\.html$/i.test(p) ? p : "dashboard.html";
}
