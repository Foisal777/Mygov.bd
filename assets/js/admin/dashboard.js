/* admin/dashboard.js — overview stats + recent applications */

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;
  renderAdminChrome("index", "অ্যাডমিন ড্যাশবোর্ড");
  document.getElementById("admin-name").textContent = admin.full_name || "অ্যাডমিন";

  const content = document.getElementById("admin-content");
  content.innerHTML = `<div class="empty-state"><span class="es-icon">⏳</span>ড্যাশবোর্ড লোড হচ্ছে…</div>`;

  let stats;
  try {
    stats = await MyGovBackend.adminStats();
  } catch (err) {
    content.innerHTML = `<div class="banner banner-error"><span>⚠️</span><div>${escapeHtml(err.message)}</div></div>`;
    return;
  }

  const cards = [
    { icon: "👥", label: "মোট নাগরিক", value: stats.users, cls: "" },
    { icon: "📄", label: "মোট আবেদন", value: stats.applications, cls: "" },
    { icon: "⏳", label: "প্রক্রিয়াধীন আবেদন", value: stats.processing, cls: "warn" },
    { icon: "🧾", label: "সক্রিয় সেবা", value: stats.services, cls: "ok" },
  ];

  content.innerHTML = `
    <div class="admin-stat-grid">
      ${cards.map((c) => `
        <div class="admin-stat ${c.cls}">
          <span class="as-icon">${c.icon}</span>
          <div><b>${toBnDigits(c.value)}</b><span>${c.label}</span></div>
        </div>`).join("")}
    </div>

    <div class="grid grid-2" style="align-items:start">
      <div class="admin-card">
        <div class="admin-card-head">
          <h2>সাম্প্রতিক আবেদন</h2>
          <div class="spacer"><a class="btn btn-primary btn-sm" href="applications.html">সব আবেদন</a></div>
        </div>
        <div class="admin-card-body flush">
          <div class="table-wrap" style="border:none">
            <table class="data-table">
              <thead><tr><th>ট্র্যাকিং</th><th>সেবা</th><th>অবস্থা</th></tr></thead>
              <tbody>
                ${(stats.recentApplications || []).map((a) => `
                  <tr>
                    <td><b>${escapeHtml(a.tracking_no)}</b></td>
                    <td>${escapeHtml(a.service_name)}</td>
                    <td>${adminStatusBadge(a.status)}</td>
                  </tr>`).join("") ||
                  `<tr><td colspan="3" class="text-muted text-center">কোনো আবেদন নেই</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="admin-card">
          <div class="admin-card-head"><h2>দ্রুত কার্যক্রম</h2></div>
          <div class="admin-card-body">
            <div class="grid" style="gap:.7rem">
              <a class="btn btn-primary" href="applications.html">📄 আবেদন পরিচালনা করুন</a>
              <a class="btn btn-outline" href="users.html">👥 নাগরিক ইউজার দেখুন</a>
              <a class="btn btn-outline" href="services.html">🧾 নতুন সেবা যোগ/সম্পাদনা</a>
              <a class="btn btn-ghost" href="../registration.html">🌐 নাগরিক রেজিস্ট্রেশন পেজ</a>
            </div>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-head"><h2>সারসংক্ষেপ</h2></div>
          <div class="admin-card-body">
            <p style="display:flex;justify-content:space-between"><span>✓ যাচাইকৃত নাগরিক</span><b>${toBnDigits(stats.verified)}</b></p>
            <p style="display:flex;justify-content:space-between"><span>🚫 বন্ধকৃত অ্যাকাউন্ট</span><b>${toBnDigits(stats.blocked)}</b></p>
            <p style="display:flex;justify-content:space-between"><span>✅ সম্পন্ন আবেদন</span><b>${toBnDigits(stats.delivered)}</b></p>
          </div>
        </div>
      </div>
    </div>`;
});
