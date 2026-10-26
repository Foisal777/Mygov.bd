/* ============================================================
 * admin-common.js — admin panel chrome, guard, shared helpers
 * Loaded after config/supabase-client/backend/common
 * ============================================================ */

const ADMIN_NAV = [
  { href: "index.html", icon: "📊", label: "ড্যাশবোর্ড", key: "index" },
  { href: "users.html", icon: "👥", label: "নাগরিক ইউজার", key: "users" },
  { href: "applications.html", icon: "📄", label: "আবেদন সমূহ", key: "applications" },
  { href: "services.html", icon: "🧾", label: "সেবা ব্যবস্থাপনা", key: "services" },
];

function adminBrandSvg(size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#fff" opacity="0.14"/>
    <path d="M20 44V20h6l12 15V20h6v24h-6L26 29v15z" fill="#fff"/>
    <circle cx="46" cy="18" r="5.5" fill="#d9382e"/>
  </svg>`;
}

async function requireAdmin() {
  const admin = await MyGovBackend.adminCurrent();
  if (!admin) {
    toast("অ্যাডমিন লগইন প্রয়োজন", "error");
    location.href = "login.html";
    return null;
  }
  return admin;
}

function renderAdminChrome(activeKey, title) {
  const wrap = document.getElementById("admin-chrome");
  if (!wrap) return;
  wrap.innerHTML = `
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="side-brand">
        ${adminBrandSvg()}
        <div><b>myGov অ্যাডমিন</b><small>Service Delivery Console</small></div>
      </div>
      <nav class="side-nav">
        ${ADMIN_NAV.map(
          (n) => `<a href="${n.href}" class="${n.key === activeKey ? "active" : ""}">
            <span class="nav-icon">${n.icon}</span>${n.label}</a>`
        ).join("")}
      </nav>
      <div class="side-foot">
        <small>🔒 ডেমো অ্যাডমিন প্যানেল</small>
        <a href="../index.html">← নাগরিক সাইটে ফিরে যান</a>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="mobile-menu-btn" id="mobile-menu-btn" type="button">☰</button>
        <h1>${title}</h1>
        <div class="top-actions">
          <span class="user-chip">
            <span class="avatar">A</span>
            <span class="text-sm"><b id="admin-name">অ্যাডমিন</b><br><small id="admin-mode">${MyGovBackend.isDemo ? "ডেমো মোড" : "Supabase"}</small></span>
          </span>
          <button class="btn btn-ghost btn-sm" id="admin-logout" type="button">লগআউট</button>
        </div>
      </header>
      <main class="admin-content" id="admin-content"></main>
    </div>`;

  document.getElementById("mobile-menu-btn")?.addEventListener("click", () =>
    document.getElementById("admin-sidebar").classList.toggle("open")
  );
  document.getElementById("admin-logout").addEventListener("click", async () => {
    await MyGovBackend.adminLogout();
    location.href = "login.html";
  });
}

function adminStatusBadge(status) {
  const label = MyGovBackend.STATUS_LABELS[status] || status;
  return `<span class="status-badge st-${status}">${label}</span>`;
}

function adminFormatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return toBnDigits(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
}

function adminModal(title, bodyHtml) {
  let backdrop = document.getElementById("admin-modal");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "admin-modal";
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
  }
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${title}</h3>
        <button class="modal-close" id="admin-modal-close" aria-label="বন্ধ">×</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>`;
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("admin-modal-close").onclick = closeAdminModal;
  backdrop.onclick = (e) => e.target === backdrop && closeAdminModal();
  return backdrop;
}
function closeAdminModal() {
  const backdrop = document.getElementById("admin-modal");
  if (backdrop) backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

function adminConfirm(message) {
  return window.confirm(message);
}
