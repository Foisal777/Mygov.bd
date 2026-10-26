/* ============================================================
 * registration.js — multi-step citizen registration
 * Step 1 identity (mobile/email) → Step 2 OTP → Step 3 password
 * → Step 4 success. Mirrors the real myGov flow.
 * ============================================================ */

const state = { channel: "mobile", name: "", cc: "+88", mobile: "", email: "", target: "" };

/* ---------- tiny DOM helpers ---------- */
const el = (id) => document.getElementById(id);
function setFieldError(input, message) {
  const field = input.closest(".field");
  if (!field) return;
  field.classList.toggle("invalid", !!message);
  const msg = field.querySelector(".error-msg");
  if (msg && message) msg.textContent = message;
  input.classList.toggle("invalid", !!message);
}
function clearErrors(form) {
  form.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
  form.querySelectorAll(".input.invalid").forEach((i) => i.classList.remove("invalid"));
}
function setLoading(btn, on, loadingText) {
  if (!btn) return;
  if (on) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText || "অপেক্ষা করুন…"}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.html || btn.innerHTML;
  }
}
function gotoStep(n) {
  $$(".step-pane").forEach((p) => {
    p.hidden = p.dataset.pane !== String(n);
    p.classList.toggle("active", p.dataset.pane === String(n));
  });
  $$("#stepper .step").forEach((s) => {
    const i = Number(s.dataset.step);
    s.classList.toggle("active", i === n);
    s.classList.toggle("done", i < n);
  });
  safeScrollTo(0);
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (MyGovBackend.isDemo) {
    el("demo-banner").hidden = false;
    el("mode-label").textContent = "· ডেমো মোড";
  } else {
    el("mode-label").textContent = "· Supabase";
  }

  /* tabs */
  $$(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.channel = btn.dataset.tab;
      $$(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      $$(".tab-pane").forEach((p) => p.classList.toggle("active", p.dataset.tabpane === state.channel));
    })
  );

  /* numeric-only mobile inputs */
  ["m-mobile", "e-mobile"].forEach((id) =>
    el(id).addEventListener("input", (e) => (e.target.value = e.target.value.replace(/[^\d]/g, "")))
  );
  ["m-name", "e-name"].forEach((id) =>
    el(id).addEventListener("input", (e) => (e.target.value = e.target.value.replace(/[^A-Za-z .'-]/g, "")))
  );

  el("form-identity").addEventListener("submit", onSubmitIdentity);
  el("btn-verify-otp").addEventListener("click", onVerifyOtp);
  el("btn-back-1").addEventListener("click", () => gotoStep(1));
  el("btn-resend").addEventListener("click", sendOtp);
  el("form-password").addEventListener("submit", onComplete);

  $$(".toggle-pw").forEach((b) =>
    b.addEventListener("click", () => {
      const input = el(b.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.textContent = show ? "লুকান" : "দেখুন";
    })
  );
  el("password").addEventListener("input", renderPwStrength);

  $$("[data-demo-link]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      toast(`${a.dataset.demoLink} এই ডেমোতে অন্তর্ভুক্ত নয়`, "info");
    })
  );

  setupOtpBoxes();
});

/* ---------- step 1: validate + send OTP ---------- */
function validateIdentity() {
  clearErrors(el("form-identity"));
  let ok = true;

  if (state.channel === "mobile") {
    const name = el("m-name");
    const mobile = el("m-mobile");
    state.cc = el("m-cc").value;
    if (!isValidEnglishName(name.value)) { setFieldError(name, "সঠিক ইংরেজি নাম লিখুন (ন্যূনতম ৩ অক্ষর)"); ok = false; }
    if (state.cc === "+88" && !isValidBdMobile(mobile.value)) {
      setFieldError(mobile, "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 01712345678)"); ok = false;
    } else if (state.cc !== "+88" && mobile.value.replace(/\D/g, "").length < 6) {
      setFieldError(mobile, "সঠিক মোবাইল নম্বর লিখুন"); ok = false;
    }
    if (ok) {
      state.name = name.value.trim();
      state.mobile = mobile.value.trim();
      state.email = "";
      state.target = `${state.cc} ${state.mobile}`;
    }
  } else {
    const name = el("e-name");
    const email = el("e-email");
    const mobile = el("e-mobile");
    state.cc = el("e-cc").value;
    if (!isValidEnglishName(name.value)) { setFieldError(name, "সঠিক ইংরেজি নাম লিখুন (ন্যূনতম ৩ অক্ষর)"); ok = false; }
    if (!isValidEmail(email.value.trim())) { setFieldError(email, "সঠিক ইমেইল ঠিকানা লিখুন"); ok = false; }
    if (mobile.value && state.cc === "+88" && !isValidBdMobile(mobile.value)) {
      setFieldError(mobile, "সঠিক মোবাইল নম্বর লিখুন অথবা খালি রাখুন"); ok = false;
    }
    if (ok) {
      state.name = name.value.trim();
      state.email = email.value.trim();
      state.mobile = mobile.value.trim();
      state.target = state.email;
    }
  }

  const captcha = el("captcha");
  if (!captcha.checked) {
    el("captcha-field").classList.add("invalid");
    ok = false;
  } else {
    el("captcha-field").classList.remove("invalid");
  }
  return ok;
}

async function onSubmitIdentity(e) {
  e.preventDefault();
  if (!validateIdentity()) return;
  const btn = el("btn-send-otp");
  setLoading(btn, true, "OTP পাঠানো হচ্ছে…");
  try {
    const res = await MyGovBackend.requestOtp({
      channel: state.channel,
      target: state.target,
      name: state.name,
      cc: state.cc,
    });
    el("otp-target").textContent = state.target;
    if (res.demo) {
      el("otp-demo-code").hidden = false;
      el("otp-demo-value").textContent = toBnDigits(res.devCode);
    } else {
      el("otp-demo-code").hidden = true;
    }
    gotoStep(2);
    startResendTimer();
    const first = $(".otp-box");
    first?.focus();
  } catch (err) {
    toast(err.message || "OTP পাঠানো যায়নি", "error", 6000);
  } finally {
    setLoading(btn, false);
  }
}

async function sendOtp() {
  try {
    const res = await MyGovBackend.requestOtp({ channel: state.channel, target: state.target, name: state.name, cc: state.cc });
    if (res.demo) { el("otp-demo-code").hidden = false; el("otp-demo-value").textContent = toBnDigits(res.devCode); }
    toast("নতুন OTP পাঠানো হয়েছে", "success");
    startResendTimer();
  } catch (err) {
    toast(err.message || "OTP পাঠানো যায়নি", "error");
  }
}

/* ---------- OTP boxes ---------- */
function setupOtpBoxes() {
  const boxes = $$(".otp-box");
  boxes.forEach((box, idx) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      box.classList.toggle("filled", !!box.value);
      el("otp-error").hidden = true;
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
      if (boxes.every((b) => b.value)) el("btn-verify-otp").focus();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && idx > 0) boxes[idx - 1].focus();
    });
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6).split("");
      boxes.forEach((b, i) => {
        b.value = digits[i] || "";
        b.classList.toggle("filled", !!b.value);
      });
      boxes[Math.min(digits.length, 5)].focus();
    });
  });
}
function otpValue() { return $$(".otp-box").map((b) => b.value).join(""); }
function resetOtpBoxes() { $$(".otp-box").forEach((b) => { b.value = ""; b.classList.remove("filled"); }); }

let resendInterval = null;
function startResendTimer() {
  clearInterval(resendInterval);
  let left = 30;
  el("btn-resend").hidden = true;
  el("resend-timer").hidden = false;
  el("resend-seconds").textContent = left;
  resendInterval = setInterval(() => {
    left -= 1;
    el("resend-seconds").textContent = left;
    if (left <= 0) {
      clearInterval(resendInterval);
      el("btn-resend").hidden = false;
      el("resend-timer").hidden = true;
    }
  }, 1000);
}

async function onVerifyOtp() {
  const token = otpValue();
  if (token.length !== 6) {
    el("otp-error").hidden = false;
    el("otp-error-text").textContent = "৬ সংখ্যার OTP সম্পূর্ণ লিখুন";
    return;
  }
  const btn = el("btn-verify-otp");
  setLoading(btn, true, "যাচাই হচ্ছে…");
  try {
    await MyGovBackend.verifyOtp({ channel: state.channel, target: state.target, token });
    state.otpToken = token;
    resetOtpBoxes();
    gotoStep(3);
    el("password").focus();
  } catch (err) {
    el("otp-error").hidden = false;
    el("otp-error-text").textContent = err.message || "OTP সঠিক নয়";
  } finally {
    setLoading(btn, false);
  }
}

/* ---------- step 3: password ---------- */
const PW_RULES = {
  length: (v) => v.length >= 8,
  upper: (v) => /[A-Z]/.test(v),
  lower: (v) => /[a-z]/.test(v),
  number: (v) => /\d/.test(v),
  special: (v) => /[^A-Za-z0-9]/.test(v),
};
function renderPwStrength() {
  const v = el("password").value;
  const met = Object.entries(PW_RULES).map(([k, fn]) => {
    const li = el("pw-rules").querySelector(`[data-rule="${k}"]`);
    const ok = fn(v);
    li.classList.toggle("met", ok);
    return ok;
  });
  const score = met.filter(Boolean).length;
  const bar = el("pw-bar");
  const colors = ["#d9382e", "#d9382e", "#ee7027", "#b7791f", "#12996f", "#006a4e"];
  bar.style.width = `${(score / 5) * 100}%`;
  bar.style.background = colors[score];
}
function passwordValid() {
  const v = el("password").value;
  return Object.values(PW_RULES).every((fn) => fn(v));
}

async function onComplete(e) {
  e.preventDefault();
  clearErrors(el("form-password"));
  const pw = el("password");
  const pw2 = el("password2");
  let ok = true;
  if (!passwordValid()) { setFieldError(pw, "পাসওয়ার্ডের সব শর্ত পূরণ করুন"); ok = false; }
  if (pw.value !== pw2.value || !pw2.value) { setFieldError(pw2, "পাসওয়ার্ড দুটি মিলছে না"); ok = false; }
  if (!ok) return;

  const btn = el("btn-complete");
  setLoading(btn, true, "একাউন্ট তৈরি হচ্ছে…");
  try {
    const user = await MyGovBackend.completeRegistration({
      name: state.name,
      cc: state.cc,
      mobile: state.mobile,
      email: state.email,
      channel: state.channel,
      password: pw.value,
    });
    showSuccess(user);
    gotoStep(4);
  } catch (err) {
    toast(err.message || "রেজিস্ট্রেশন ব্যর্থ হয়েছে", "error", 7000);
  } finally {
    setLoading(btn, false);
  }
}

function showSuccess(user) {
  const rows = [
    ["নাম", state.name],
    [state.channel === "email" ? "ইমেইল" : "মোবাইল", state.target],
    ["অ্যাকাউন্ট ধরন", state.channel === "email" ? "ইমেইল" : "মোবাইল"],
    ["স্ট্যাটাস", "✓ যাচাইকৃত"],
  ];
  el("success-summary").innerHTML = rows
    .map(([k, v]) => `<div class="row"><span>${k}</span><b>${escapeHtml(String(v))}</b></div>`)
    .join("");
}
