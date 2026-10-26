/* admin/applications.js — review applications, update status & notes */

let allApps = [];
let filterStatus = "";
let filterQ = "";

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;
  renderAdminChrome("applications", "আবেদন ব্যবস্থাপনা");

  const content = document.getElementById("admin-content");
  content.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-head"><h2>সকল আবেদন</h2></div>
      <div class="admin-card-body">
        <div class="admin-search">
          <input class="input" id="app-search" type="search" placeholder="ট্র্যাকিং নম্বর, সেবা বা নাগরিক খুঁজুন…" />
          <select class="input" id="app-status">
            <option value="">সব অবস্থা</option>
            ${MyGovBackend.APP_STATUSES.map((s) =>
              `<option value="${s}">${MyGovBackend.STATUS_LABELS[s]}</option>`).join("")}
          </select>
          <button class="btn btn-outline btn-sm" id="app-reload">🔄 রিফ্রেশ</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>ট্র্যাকিং নম্বর</th><th>সেবা</th><th>আবেদনকারী</th><th>দপ্তর</th><th>তারিখ</th><th>অবস্থা</th><th>অ্যাকশন</th></tr>
            </thead>
            <tbody id="app-tbody"></tbody>
          </table>
        </div>
        <div class="empty-state" id="app-empty" hidden>
          <span class="es-icon">📭</span><b>কোনো আবেদন পাওয়া যায়নি</b>
        </div>
      </div>
    </div>`;

  document.getElementById("app-search").addEventListener("input", (e) => { filterQ = e.target.value; render(); });
  document.getElementById("app-status").addEventListener("change", (e) => { filterStatus = e.target.value; render(); });
  document.getElementById("app-reload").addEventListener("click", load);
  await load();
});

async function load() {
  try {
    allApps = await MyGovBackend.adminListApplications();
  } catch (err) {
    toast(err.message || "আবেদন লোড ব্যর্থ", "error");
    allApps = [];
  }
  render();
}

function render() {
  const q = filterQ.trim().toLowerCase();
  const list = allApps.filter((a) =>
    (!filterStatus || a.status === filterStatus) &&
    (!q || [a.tracking_no, a.service_name, a.applicant_name, a.applicant_mobile, a.office]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
  );
  document.getElementById("app-empty").hidden = list.length > 0;
  document.getElementById("app-tbody").innerHTML = list.map((a) => `
    <tr>
      <td><b>${escapeHtml(a.tracking_no)}</b></td>
      <td>${escapeHtml(a.service_name)}</td>
      <td>${escapeHtml(a.applicant_name || "—")}<br><small class="text-muted">${escapeHtml(a.applicant_mobile || "")}</small></td>
      <td>${escapeHtml(a.office || "—")}</td>
      <td>${adminFormatDate(a.created_at)}</td>
      <td>${adminStatusBadge(a.status)}</td>
      <td><button class="btn btn-primary btn-sm" data-manage="${a.id}">পরিচালনা</button></td>
    </tr>`).join("");

  document.querySelectorAll("[data-manage]").forEach((b) =>
    b.addEventListener("click", () => openManage(b.dataset.manage)));
}

function openManage(id) {
  const a = allApps.find((x) => x.id === id);
  if (!a) return;
  const formData = a.form_data || {};
  const formRows = Object.entries(formData).filter(([, v]) => v !== "" && v != null);

  adminModal(`আবেদন — ${escapeHtml(a.tracking_no)}`, `
    <div class="detail-grid">
      <div class="dg-item"><span>সেবা</span><b>${escapeHtml(a.service_name)}</b></div>
      <div class="dg-item"><span>দপ্তর</span><b>${escapeHtml(a.office || "—")}</b></div>
      <div class="dg-item"><span>আবেদনকারী</span><b>${escapeHtml(a.applicant_name || "—")}</b></div>
      <div class="dg-item"><span>মোবাইল</span><b>${escapeHtml(a.applicant_mobile || "—")}</b></div>
      <div class="dg-item"><span>ফি</span><b>${escapeHtml(a.fee || "—")}</b></div>
      <div class="dg-item"><span>জমার তারিখ</span><b>${adminFormatDate(a.created_at)}</b></div>
    </div>

    ${formRows.length ? `
      <h4 style="margin:.4rem 0 .6rem">📋 আবেদনের তথ্য</h4>
      <div class="detail-grid">
        ${formRows.map(([k, v]) => `
          <div class="dg-item" style="grid-column:${String(v).length > 60 ? "1/-1" : "auto"}">
            <span>${escapeHtml(fieldLabel(k))}</span><b>${escapeHtml(String(v))}</b>
          </div>`).join("")}
      </div>` : ""}

    <h4 style="margin:1rem 0 .6rem">🔄 অবস্থা পরিবর্তন করুন</h4>
    <div class="status-picker" id="status-picker">
      ${MyGovBackend.APP_STATUSES.map((s) => `
        <button type="button" data-status="${s}" class="${a.status === s ? "active" : ""}">
          ${MyGovBackend.STATUS_LABELS[s]}
        </button>`).join("")}
    </div>

    <div class="field mt-2">
      <label for="admin-note">অফিস মন্তব্য (নাগরিক ট্র্যাকিং পেজে দেখা যাবে)</label>
      <textarea class="input" id="admin-note" rows="2" placeholder="যাচাই/সংশোধন সংক্রান্ত মন্তব্য…">${escapeHtml(a.admin_note || "")}</textarea>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:.6rem;margin-top:1rem">
      <button class="btn btn-ghost" onclick="closeAdminModal()">বন্ধ করুন</button>
      <button class="btn btn-primary" id="save-status">💾 সংরক্ষণ করুন</button>
    </div>`);

  let chosen = a.status;
  document.querySelectorAll("#status-picker button").forEach((btn) =>
    btn.addEventListener("click", () => {
      chosen = btn.dataset.status;
      document.querySelectorAll("#status-picker button").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
    })
  );

  document.getElementById("save-status").addEventListener("click", async () => {
    const btn = document.getElementById("save-status");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> সংরক্ষণ হচ্ছে…`;
    try {
      await MyGovBackend.adminUpdateApplication(id, {
        status: chosen,
        admin_note: document.getElementById("admin-note").value.trim(),
      });
      toast("আবেদনের অবস্থা হালনাগাদ হয়েছে", "success");
      closeAdminModal();
      await load();
    } catch (err) {
      toast(err.message || "সংরক্ষণ ব্যর্থ", "error");
      btn.disabled = false;
      btn.textContent = "💾 সংরক্ষণ করুন";
    }
  });
}

/* Map technical field keys to friendly Bengali labels */
function fieldLabel(key) {
  const labels = {
    samity_name: "সমিতের নাম", samity_type: "সমিতির ধরন", district: "জেলা", upazila: "উপজেলা/থানা",
    union: "ইউনিয়ন/ওয়ার্ড", member_count: "সদস্য সংখ্যা", formation_date: "গঠনের তারিখ",
    chairman_name: "সভাপতির নাম", secretary_name: "সম্পাদকের নাম", secretary_mobile: "সম্পাদকের মোবাইল",
    objective: "লক্ষ্য ও কার্যক্রম", purpose: "আবেদনের বিবরণ", preferred_date: "পছন্দের তারিখ", note: "মন্তব্য",
    full_name: "নাম", mobile: "মোবাইল", email: "ইমেইল", nid: "NID", address: "ঠিকানা",
  };
  return labels[key] || key;
}
