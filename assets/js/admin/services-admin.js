/* admin/services-admin.js — service catalogue CRUD */

let allServices = [];

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;
  renderAdminChrome("services", "সেবা ব্যবস্থাপনা");

  const content = document.getElementById("admin-content");
  content.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-head">
        <h2>সেবা তালিকা (<span id="svc-count">…</span>)</h2>
        <div class="spacer">
          <input class="input" id="svc-search" type="search" placeholder="সেবা খুঁজুন…" style="max-width:260px" />
          <button class="btn btn-primary btn-sm" id="btn-add-svc">+ নতুন সেবা</button>
        </div>
      </div>
      <div class="admin-card-body flush">
        <div class="table-wrap" style="border:none">
          <table class="data-table">
            <thead>
              <tr><th>সেবা</th><th>খাত</th><th>দপ্তর</th><th>ফি / সময়</th><th>সেবাগ্রহীতা</th><th>অবস্থা</th><th>অ্যাকশন</th></tr>
            </thead>
            <tbody id="svc-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  document.getElementById("btn-add-svc").addEventListener("click", () => openForm(null));
  document.getElementById("svc-search").addEventListener("input", (e) => render(e.target.value));
  await load();
});

async function load() {
  try {
    allServices = await MyGovBackend.listServices({ includeInactive: true });
  } catch (err) {
    toast(err.message || "সেবা লোড ব্যর্থ", "error");
    allServices = [];
  }
  render("");
}

function render(term) {
  const q = term.trim().toLowerCase();
  const list = allServices.filter((s) =>
    !q || [s.name, s.office, sectorName(s.sector), s.desc].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  );
  document.getElementById("svc-count").textContent = toBnDigits(list.length);
  document.getElementById("svc-tbody").innerHTML = list.map((s) => `
    <tr>
      <td><b>${escapeHtml(s.name)}</b><br><small class="text-muted">${escapeHtml(s.id)}</small></td>
      <td>${escapeHtml(sectorName(s.sector))}</td>
      <td>${escapeHtml(s.office || "—")}</td>
      <td>${escapeHtml(s.fee || "—")}<br><small class="text-muted">${escapeHtml(s.days || "—")}</small></td>
      <td>${escapeHtml(RECIPIENTS.find((r) => r.id === s.recipient)?.name || s.recipient || "—")}</td>
      <td>${s.active === false ? '<span class="mini-badge mb-off">নিষ্ক্রিয়</span>' : '<span class="mini-badge mb-on">সক্রিয়</span>'}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" data-edit="${s.id}">সম্পাদনা</button>
          <button class="btn btn-ghost btn-sm" data-toggle="${s.id}">${s.active === false ? "চালু" : "বন্ধ"}</button>
          <button class="btn btn-accent btn-sm" data-del="${s.id}">মুছুন</button>
        </div>
      </td>
    </tr>`).join("");

  document.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => openForm(allServices.find((s) => s.id === b.dataset.edit))));
  document.querySelectorAll("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => toggleActive(b.dataset.toggle)));
  document.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => remove(b.dataset.del)));
}

function openForm(existing) {
  const s = existing || {};
  adminModal(existing ? "সেবা সম্পাদনা" : "নতুন সেবা যোগ করুন", `
    <form id="svc-form" class="mt-0">
      <div class="field">
        <label>সেবার নাম <span class="req">*</span></label>
        <input class="input" id="f-name" value="${escapeHtml(s.name || "")}" placeholder="যেমন: নতুন সমবায় সমিতি রেজিস্ট্রেশন" />
      </div>
      <div class="grid grid-2">
        <div class="field">
          <label>সেবা খাত <span class="req">*</span></label>
          <select class="input" id="f-sector">
            ${SERVICE_SECTORS.map((x) =>
              `<option value="${x.id}" ${s.sector === x.id ? "selected" : ""}>${x.icon} ${x.name}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>সেবাগ্রহীতা</label>
          <select class="input" id="f-recipient">
            ${RECIPIENTS.map((x) =>
              `<option value="${x.id}" ${s.recipient === x.id ? "selected" : ""}>${x.name}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field">
        <label>মন্ত্রণালয় / দপ্তর <span class="req">*</span></label>
        <input class="input" id="f-office" value="${escapeHtml(s.office || "")}" placeholder="যেমন: সমবায় অধিদপ্তর" />
      </div>
      <div class="grid grid-2">
        <div class="field">
          <label>ফি</label>
          <input class="input" id="f-fee" value="${escapeHtml(s.fee || "")}" placeholder="৳ ১,০০০ / বিনামূল্যে" />
        </div>
        <div class="field">
          <label>সময়সীমা</label>
          <input class="input" id="f-days" value="${escapeHtml(s.days || "")}" placeholder="৩০ কার্যদিবস" />
        </div>
      </div>
      <div class="field">
        <label>বিবরণ</label>
        <textarea class="input" id="f-desc" rows="2" placeholder="সেবার সংক্ষিপ্ত বিবরণ">${escapeHtml(s.desc || "")}</textarea>
      </div>
      <div class="field">
        <label>প্রয়োজনীয় কাগজপত্র (কমা দিয়ে আলাদা করুন)</label>
        <input class="input" id="f-docs" value="${escapeHtml((s.docs || []).join(", "))}" placeholder="NID, ছবি, ঠিকানা প্রমাণ" />
      </div>
      <div class="field">
        <label>আবেদন ফর্ম</label>
        <select class="input" id="f-form">
          <option value="" ${!s.form ? "selected" : ""}>সাধারণ ফর্ম</option>
          <option value="samity" ${s.form === "samity" ? "selected" : ""}>সমবায় সমিতি ফর্ম</option>
        </select>
      </div>
      <label class="checkbox-row" style="margin-bottom:1rem">
        <input type="checkbox" id="f-popular" ${s.popular ? "checked" : ""} /> জনপ্রিয় সেবা হিসেবে দেখান
      </label>
      <label class="checkbox-row" style="margin-bottom:1rem">
        <input type="checkbox" id="f-active" ${s.active !== false ? "checked" : ""} /> সক্রিয় (নাগরিক সাইটে দেখা যাবে)
      </label>
      <div style="display:flex;justify-content:flex-end;gap:.6rem">
        <button type="button" class="btn btn-ghost" onclick="closeAdminModal()">বাতিল</button>
        <button type="submit" class="btn btn-primary">💾 সংরক্ষণ</button>
      </div>
    </form>`);

  document.getElementById("svc-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      ...(existing ? { id: existing.id } : {}),
      name: document.getElementById("f-name").value.trim(),
      sector: document.getElementById("f-sector").value,
      recipient: document.getElementById("f-recipient").value,
      office: document.getElementById("f-office").value.trim(),
      fee: document.getElementById("f-fee").value.trim(),
      days: document.getElementById("f-days").value.trim(),
      desc: document.getElementById("f-desc").value.trim(),
      docs: document.getElementById("f-docs").value.split(",").map((x) => x.trim()).filter(Boolean),
      form: document.getElementById("f-form").value || null,
      popular: document.getElementById("f-popular").checked,
      active: document.getElementById("f-active").checked,
    };
    if (!payload.name || !payload.office) return toast("নাম ও দপ্তর আবশ্যক", "error");
    try {
      await MyGovBackend.adminUpsertService(payload);
      toast(existing ? "সেবা হালনাগাদ হয়েছে" : "নতুন সেবা যোগ হয়েছে", "success");
      closeAdminModal();
      await load();
    } catch (err) {
      toast(err.message || "সংরক্ষণ ব্যর্থ", "error");
    }
  });
}

async function toggleActive(id) {
  const s = allServices.find((x) => x.id === id);
  try {
    await MyGovBackend.adminUpsertService({ ...s, active: s.active === false });
    toast(s.active === false ? "সেবা সক্রিয় করা হয়েছে" : "সেবা নিষ্ক্রিয় করা হয়েছে", "success");
    await load();
  } catch (err) {
    toast(err.message || "কার্যক্রম ব্যর্থ", "error");
  }
}

async function remove(id) {
  const s = allServices.find((x) => x.id === id);
  if (!adminConfirm(`‘${s.name}’ সেবাটি মুছে ফেলতে চান?`)) return;
  try {
    await MyGovBackend.adminDeleteService(id);
    toast("সেবা মুছে ফেলা হয়েছে", "success");
    await load();
  } catch (err) {
    toast(err.message || "মুছে ফেলা ব্যর্থ", "error");
  }
}
