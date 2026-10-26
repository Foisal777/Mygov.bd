/* ============================================================
 * forgot-password.js — OTP based password recovery
 * ============================================================ */

const el = (id) => document.getElementById(id);
let channel = "mobile";
let identifier = "";
let otpToken = "";

function pane(n) {
  [1, 2, 3, 4].forEach((i) => (el(`pane-${i}`).hidden = i !== n));
  safeScrollTo(0);
}
function setFieldError(input, message) {
  const field = input.closest(".field");
  field?.classList.toggle("invalid", !!message);
  const msg = field?.querySelector(".error-msg");
  if (msg && message) msg.textContent = message;
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
    el("demo-code").textContent = toBnDigits(window.MYGOV_CONFIG.DEMO_OTP || "123456");
  }

  $$(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      channel = btn.dataset.tab;
      $$(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      const input = el("identifier");
      input.value = "";
      if (channel === "mobile") {
        el("id-label").innerHTML = "মোবাইল নম্বর (ইংরেজিতে) <span class='req'>*</span>";
        el("id-hint").textContent = "রেজিস্ট্রেশন করা মোবাইল নম্বর লিখুন";
        input.placeholder = "01XXXXXXXXX";
        input.type = "tel";
      } else {
        el("id-label").innerHTML = "ইমেইল ঠিকানা <span class='req'>*</span>";
        el("id-hint").textContent = "রেজিস্ট্রেশন করা ইমেইল লিখুন";
        input.placeholder = "name@example.com";
        input.type = "email";
      }
    })
  );

  el("identifier").addEventListener("input", (e) => {
    if (channel === "mobile") e.target.value = e.target.value.replace(/[^\d]/g, "");
  });

  /* step 1 → send OTP */
  el("form-id").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = el("identifier");
    identifier = input.value.trim();
    let ok = true;
    if (channel === "mobile" && !isValidBdMobile(identifier)) {
      setFieldError(input, "সঠিক মোবাইল নম্বর লিখুন (যেমন: 01712345678)"); ok = false;
    }
    if (channel === "email" && !isValidEmail(identifier)) {
      setFieldError(input, "সঠিক ইমেইল লিখুন"); ok = false;
    }
    if (!ok) return;

    const btn = el("btn-send");
    setLoading(btn, true, "OTP পাঠানো হচ্ছে…");
    try {
      const target = channel === "email" ? identifier : `+88 ${identifier}`;
      const res = await MyGovBackend.requestOtp({ channel, target, cc: "+88", mobile: identifier });
      el("otp-target").textContent = target;
      if (res.demo) {
        el("otp-demo").hidden = false;
        el("otp-demo-value").textContent = toBnDigits(res.devCode);
      } else {
        el("otp-demo").hidden = true;
      }
      pane(2);
      startTimer();
      $(".otp-box")?.focus();
    } catch (err) {
      toast(err.message || "OTP পাঠানো যায়নি", "error");
    } finally {
      setLoading(btn, false);
    }
  });

  /* OTP boxes */
  const boxes = $$(".otp-box");
  boxes.forEach((box, idx) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      box.classList.toggle("filled", !!box.value);
      if (box.value && idx < 5) boxes[idx + 1].focus();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && idx > 0) boxes[idx - 1].focus();
    });
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6).split("");
      boxes.forEach((b, i) => { b.value = d[i] || ""; b.classList.toggle("filled", !!b.value); });
    });
  });
  const readOtp = () => boxes.map((b) => b.value).join("");

  let timer;
  function startTimer() {
    clearInterval(timer);
    let left = 30;
    el("btn-resend").hidden = true;
    el("resend-timer").hidden = false;
    el("resend-seconds").textContent = left;
    timer = setInterval(() => {
      left -= 1;
      el("resend-seconds").textContent = left;
      if (left <= 0) { clearInterval(timer); el("btn-resend").hidden = false; el("resend-timer").hidden = true; }
    }, 1000);
  }
  el("btn-resend").addEventListener("click", async () => {
    await MyGovBackend.requestOtp({ channel, target: channel === "email" ? identifier : `+88 ${identifier}`, cc: "+88", mobile: identifier });
    toast("নতুন OTP পাঠানো হয়েছে", "success");
    startTimer();
  });
  el("btn-back").addEventListener("click", () => pane(1));

  /* step 2 → verify */
  el("btn-verify").addEventListener("click", async () => {
    otpToken = readOtp();
    if (otpToken.length !== 6) return toast("৬ সংখ্যার OTP লিখুন", "error");
    const btn = el("btn-verify");
    setLoading(btn, true, "যাচাই হচ্ছে…");
    try {
      if (!MyGovBackend.isDemo && channel === "email") {
        // real email OTP establishes the session needed to change the password
        await MyGovBackend.verifyOtp({ channel, target: identifier, token: otpToken });
      } else if (MyGovBackend.isDemo && otpToken !== (window.MYGOV_CONFIG.DEMO_OTP || "123456")) {
        throw new Error("ভুল OTP — ডেমো কোড ১২৩৪৫৬");
      }
      // mobile + Supabase: OTP is verified server-side during the reset call
      pane(3);
      el("password").focus();
    } catch (err) {
      toast(err.message || "OTP সঠিক নয়", "error");
    } finally {
      setLoading(btn, false);
    }
  });

  /* password rules */
  const RULES = {
    length: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    lower: (v) => /[a-z]/.test(v),
    number: (v) => /\d/.test(v),
    special: (v) => /[^A-Za-z0-9]/.test(v),
  };
  el("password").addEventListener("input", () => {
    const v = el("password").value;
    Object.entries(RULES).forEach(([k, fn]) =>
      el("pw-rules").querySelector(`[data-rule="${k}"]`).classList.toggle("met", fn(v))
    );
  });
  $$(".toggle-pw").forEach((b) =>
    b.addEventListener("click", () => {
      const input = el(b.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.textContent = show ? "লুকান" : "দেখুন";
    })
  );

  /* step 3 → save */
  el("form-pw").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = el("password");
    const pw2 = el("password2");
    const allMet = Object.values(RULES).every((fn) => fn(pw.value));
    let ok = true;
    if (!allMet) { setFieldError(pw, "পাসওয়ার্ডের সব শর্ত পূরণ করুন"); ok = false; }
    if (pw.value !== pw2.value) { setFieldError(pw2, "পাসওয়ার্ড দুটি মিলছে না"); ok = false; }
    if (!ok) return;

    const btn = el("btn-save");
    setLoading(btn, true, "সংরক্ষণ হচ্ছে…");
    try {
      if (channel === "email") {
        await MyGovBackend.updatePassword(pw.value);
      } else if (MyGovBackend.isDemo) {
        await MyGovBackend.resetPasswordByOtp({ identifier, password: pw.value });
      } else {
        await MyGovBackend.resetPasswordByOtp({
          channel: "mobile", cc: "+88", mobile: identifier, token: otpToken, password: pw.value,
        });
      }
      pane(4);
    } catch (err) {
      toast(err.message || "পাসওয়ার্ড রিসেট ব্যর্থ", "error", 6000);
    } finally {
      setLoading(btn, false);
    }
  });
});
