/* admin/users.js — citizen user management */

let allUsers = [];

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;
  renderAdminChrome("users", "নাগরিক ইউজার ব্যবস্থাপনা");

  const content = document.getElementById("admin-content");
  content.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-head">
        <h2>সকল নাগরিক (<span id="user-count">…</span>)</h2>
        <div class="spacer">
          <input class="input" id="user-search" type="search" placeholder="নাম, মোবাইল, NID খুঁজুন…" style="max-width:300px" />
        </div>
      </div>
      <div class="admin-card-body flush">
        <div class="table-wrap" style="border:none">
          <table class="data-table">
            <thead>
              <tr><th>নাগরিক</th><th>মোবাইল / ইমেইল</th><th>NID</th><th>এলাকা</th><th>অবস্থা</th><th>তারিখ</th><th>অ্যাকশন</th></tr>
            </thead>
            <tbody id="user-tbody"></tbody>
          </table>
        </div>
        <div class="empty-state" id="user-empty" hidden>
          <span class="es-icon">👤</span><b>কোনো ইউজার পাওয়া যায়নি</b>
        </div>
      </div>
    </div>`;

  await loadUsers();
  document.getElementById("user-search").addEventListener("input", (e) => renderUsers(e.target.value));
});

async function loadUsers() {
  try {
    allUsers = await MyGovBackend.adminListUsers();
  } catch (err) {
    toast(err.message || "ইউজার লোড ব্যর্থ", "error");
    allUsers = [];
  }
  renderUsers("");
}

function renderUsers(term) {
  const q = term.trim().toLowerCase();
  const list = allUsers.filter((u) =>
    !q || [u.full_name, u.email, u.mobile, u.mobile_digits || u.mobileDigits, u.nid]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  );
  document.getElementById("user-count").textContent = toBnDigits(list.length);
  document.getElementById("user-empty").hidden = list.length > 0;
  const mobileOf = (u) => u.mobile || (u.mobile_digits ? `+${u.mobile_digits}` : "—");
  const nidOf = (u) => u.nid || u.profile?.nid || "—";

  document.getElementById("user-tbody").innerHTML = list.map((u) => `
    <tr>
      <td>
        <div style="display:flex;gap:.6rem;align-items:center">
          <span class="avatar" style="width:34px;height:34px;border-radius:50%;background:var(--brand-700);color:#fff;display:grid;place-items:center;font-weight:700">${escapeHtml(initials(u.full_name || ""))}</span>
          <b>${escapeHtml(u.full_name || "নামহীন")}</b>
        </div>
      </td>
      <td><div>${escapeHtml(mobileOf(u))}</div><small class="text-muted">${escapeHtml(u.email || "—")}</small></td>
      <td>${escapeHtml(nidOf(u))}</td>
      <td>${escapeHtml([u.district || u.profile?.district, u.division || u.profile?.division].filter(Boolean).join(", ") || "—")}</td>
      <td>
        ${u.blocked ? '<span class="mini-badge mb-blocked">🚫 বন্ধ</span>'
          : u.is_verified ? '<span class="mini-badge mb-on">✓ যাচাইকৃত</span>'
          : '<span class="mini-badge mb-off">অযাচাইকৃত</span>'}
      </td>
      <td>${adminFormatDate(u.created_at)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-view="${u.id}">বিস্তারিত</button>
          <button class="btn btn-outline btn-sm" data-verify="${u.id}">${u.is_verified ? "যাচাই বাতিল" : "যাচাই করুন"}</button>
          <button class="btn ${u.blocked ? "btn-primary" : "btn-accent"} btn-sm" data-block="${u.id}">${u.blocked ? "চালু করুন" : "বন্ধ করুন"}</button>
        </div>
      </td>
    </tr>`).join("");

  document.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => viewUser(b.dataset.view)));
  document.querySelectorAll("[data-verify]").forEach((b) =>
    b.addEventListener("click", () => toggleVerify(b.dataset.verify)));
  document.querySelectorAll("[data-block]").forEach((b) =>
    b.addEventListener("click", () => toggleBlock(b.dataset.block)));
}

function viewUser(id) {
  const u = allUsers.find((x) => x.id === id);
  if (!u) return;
  const p = u.profile || {};
  adminModal(`নাগরিক তথ্য — ${escapeHtml(u.full_name || "")}`, `
    <div class="detail-grid">
      <div class="dg-item"><span>পূর্ণ নাম</span><b>${escapeHtml(u.full_name || "—")}</b></div>
      <div class="dg-item"><span>মোবাইল</span><b>${escapeHtml(u.mobile || "—")}</b></div>
      <div class="dg-item"><span>ইমেইল</span><b>${escapeHtml(u.email || "—")}</b></div>
      <div class="dg-item"><span>NID</span><b>${escapeHtml(u.nid || p.nid || "—")}</b></div>
      <div class="dg-item"><span>জন্ম তারিখ</span><b>${escapeHtml(u.birth_date || p.birth_date || "—")}</b></div>
      <div class="dg-item"><span>লিঙ্গ</span><b>${escapeHtml(u.gender || p.gender || "—")}</b></div>
      <div class="dg-item"><span>বিভাগ</span><b>${escapeHtml(u.division || p.division || "—")}</b></div>
      <div class="dg-item"><span>জেলা</span><b>${escapeHtml(u.district || p.district || "—")}</b></div>
      <div class="dg-item" style="grid-column:1/-1"><span>ঠিকানা</span><b>${escapeHtml(u.address || p.address || "—")}</b></div>
      <div class="dg-item"><span>রেজিস্ট্রেশন</span><b>${adminFormatDate(u.created_at)}</b></div>
      <div class="dg-item"><span>অবস্থা</span><b>${u.blocked ? "🚫 বন্ধ" : u.is_verified ? "✓ যাচাইকৃত" : "অযাচাইকৃত"}</b></div>
    </div>
    <div style="text-align:right"><button class="btn btn-primary" onclick="closeAdminModal()">বন্ধ করুন</button></div>`);
}

async function toggleVerify(id) {
  const u = allUsers.find((x) => x.id === id);
  try {
    await MyGovBackend.adminUpdateUser(id, { is_verified: !u.is_verified });
    toast(u.is_verified ? "যাচাই বাতিল করা হয়েছে" : "ইউজার যাচাই করা হয়েছে", "success");
    await loadUsers();
  } catch (err) {
    toast(err.message || "কার্যক্রম ব্যর্থ", "error");
  }
}

async function toggleBlock(id) {
  const u = allUsers.find((x) => x.id === id);
  const action = u.blocked ? "চালু" : "বন্ধ";
  if (!adminConfirm(`‘${u.full_name}’-এর অ্যাকাউন্ট ${action} করতে চান?`)) return;
  try {
    await MyGovBackend.adminUpdateUser(id, { blocked: !u.blocked });
    toast(`অ্যাকাউন্ট ${action} করা হয়েছে`, "success");
    await loadUsers();
  } catch (err) {
    toast(err.message || "কার্যক্রম ব্যর্থ", "error");
  }
}
