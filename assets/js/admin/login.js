/* admin/login.js */
const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  const demo = MyGovBackend.isDemo;
  el("demo-banner").hidden = !demo;
  el("cred-hint").hidden = !demo;
  if (demo) {
    const cfg = window.MYGOV_CONFIG.DEMO_ADMIN || {};
    el("hint-user").textContent = cfg.USERNAME || "admin@mygov-demo.app";
    el("hint-pass").textContent = cfg.PASSWORD || "Admin@123";
  }

  // already signed in?
  if (await MyGovBackend.adminCurrent()) location.href = "index.html";

  el("btn-fill-demo").addEventListener("click", () => {
    const cfg = window.MYGOV_CONFIG.DEMO_ADMIN || {};
    el("username").value = cfg.USERNAME || "admin@mygov-demo.app";
    el("password").value = cfg.PASSWORD || "Admin@123";
  });

  document.querySelectorAll(".toggle-pw").forEach((b) =>
    b.addEventListener("click", () => {
      const input = el(b.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.textContent = show ? "লুকান" : "দেখুন";
    })
  );

  el("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = el("username");
    const password = el("password");
    let ok = true;
    username.closest(".field").classList.toggle("invalid", !username.value.trim());
    password.closest(".field").classList.toggle("invalid", !password.value);
    if (!username.value.trim() || !password.value) ok = false;
    if (!ok) return;

    const btn = el("btn-admin-login");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> যাচাই হচ্ছে…`;
    try {
      await MyGovBackend.adminLogin({ username: username.value, password: password.value });
      toast("অ্যাডমিন লগইন সফল", "success");
      setTimeout(() => (location.href = "index.html"), 450);
    } catch (err) {
      toast(err.message || "অ্যাডমিন লগইন ব্যর্থ", "error", 6000);
      btn.disabled = false;
      btn.textContent = "অ্যাডমিন লগইন";
    }
  });
});
