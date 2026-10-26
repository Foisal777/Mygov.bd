/* ============================================================
 * dashboard.js — citizen dashboard (protected)
 * ============================================================ */

const el = (id) => document.getElementById(id);

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return toBnDigits(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
}

function profileCompletion(user) {
  const p = user.profile || {};
  const fields = [
    user.full_name || user.name,
    user.mobile,
    user.email,
    user.nid || p.nid,
    user.birth_date || p.birth_date,
    user.gender || p.gender,
    user.division || p.division,
    user.district || p.district,
    user.address || p.address,
  ];
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  el("welcome-name").textContent = `স্বাগতম, ${user.full_name || user.name || "নাগরিক"}`;
  const contact = user.mobile || user.email || "—";
  el("welcome-meta").textContent = `${contact} · মাইগভ নাগরিক ড্যাশবোর্ড`;

  const pct = profileCompletion(user);
  el("profile-ring").style.setProperty("--p", pct);
  el("profile-pct").textContent = `${toBnDigits(pct)}%`;

  let apps = [];
  try {
    apps = await MyGovBackend.listApplications();
  } catch (err) {
    toast(err.message || "আবেদন লোড করা যায়নি", "error");
  }

  const processing = apps.filter((a) => ["submitted", "processing"].includes(a.status)).length;
  const delivered = apps.filter((a) => ["delivered", "approved"].includes(a.status)).length;
  const docs = (user.profile?.documents || user.documents || []).length;

  const stats = [
    { icon: "📄", label: "মোট আবেদন", value: apps.length },
    { icon: "⏳", label: "প্রক্রিয়াধীন", value: processing },
    { icon: "✅", label: "সম্পন্ন", value: delivered },
    { icon: "🗂️", label: "ডকুমেন্ট", value: docs },
  ];
  el("stat-grid").innerHTML = stats
    .map(
      (s) => `
    <div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <div><b>${toBnDigits(s.value)}</b><span>${s.label}</span></div>
    </div>`
    )
    .join("");

  if (!apps.length) {
    el("empty-apps").hidden = false;
    el("app-tbody").closest(".table-wrap").hidden = true;
    return;
  }
  el("app-tbody").innerHTML = apps
    .map(
      (a) => `
    <tr>
      <td><b>${escapeHtml(a.tracking_no)}</b></td>
      <td>${escapeHtml(a.service_name)}</td>
      <td>${escapeHtml(a.office || "—")}</td>
      <td>${formatDate(a.created_at)}</td>
      <td><span class="status-badge st-${a.status}">${statusLabel(a.status)}</span></td>
    </tr>`
    )
    .join("");
});
