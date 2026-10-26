/* ============================================================
 * apply.js — dynamic service application form
 * URL: apply.html?id=srv-17  (falls back to generic schema)
 * ============================================================ */

const params = new URLSearchParams(location.search);
const serviceId = params.get("id");
let root;

function fieldHtml(f) {
  const base = `class="input" id="fld-${f.name}" name="${f.name}" ${f.required ? "required" : ""}`;
  const label = `<label for="fld-${f.name}">${f.label} ${f.required ? '<span class="req">*</span>' : ""}</label>`;
  let control;
  if (f.type === "select") {
    control = `<select ${base}>
      <option value="">— নির্বাচন করুন —</option>
      ${f.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("")}
    </select>`;
  } else if (f.type === "textarea") {
    control = `<textarea ${base} rows="3" placeholder="${escapeHtml(f.placeholder || "")}"></textarea>`;
  } else {
    // Numeric fields use text + numeric keypad so Bengali numerals (১৫) are
    // accepted too; validation happens through parseNumber().
    const inputType = f.type === "number" ? "text" : f.type;
    const inputMode = f.type === "number" || f.mobile ? 'inputmode="numeric"' : "";
    control = `<input ${base} type="${inputType}" ${inputMode}
      ${f.placeholder ? `placeholder="${escapeHtml(f.placeholder)}"` : ""} ${f.min != null ? `data-min="${f.min}"` : ""} />`;
  }
  return `<div class="field">${label}${control}<div class="error-msg">এই ঘরটি পূরণ করা আবশ্যক</div></div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  root = document.getElementById("apply-root");
  const user = await MyGovBackend.currentUser();
  let services = [];
  try {
    services = await MyGovBackend.listServices();
  } catch {
    services = FALLBACK_SERVICES;
  }
  const service = services.find((s) => s.id === serviceId) ||
    FALLBACK_SERVICES.find((s) => s.id === serviceId);

  if (!service) {
    root.innerHTML = `<div class="card card-pad empty-state">
      <span class="es-icon">🧭</span><b>সেবা পাওয়া যায়নি</b>
      <a class="btn btn-primary mt-2" href="services.html">সেবা তালিকায় ফিরে যান</a></div>`;
    return;
  }

  if (!user) {
    root.innerHTML = `<div class="card card-pad empty-state">
      <span class="es-icon">🔐</span><b>আবেদনের জন্য লগইন প্রয়োজন</b>
      <p class="text-muted">‘${escapeHtml(service.name)}’ সেবায় আবেদন করতে আগে লগইন করুন।</p>
      <a class="btn btn-primary" href="login.html?next=apply.html%3Fid%3D${encodeURIComponent(service.id)}">লগইন / রেজিস্ট্রেশন</a>
    </div>`;
    return;
  }

  const schema = FORM_SCHEMAS[service.form] || FORM_SCHEMAS.generic;
  const profile = user.profile || {};

  root.innerHTML = `
    <div class="card card-pad" style="margin-bottom:1.2rem">
      <div style="display:flex;gap:.9rem;align-items:flex-start">
        <span class="service-icon" style="flex:none">${sectorIcon(service.sector)}</span>
        <div>
          <h1 style="font-size:1.35rem;margin-bottom:.25rem">${escapeHtml(service.name)}</h1>
          <p class="text-muted text-sm" style="margin:0">${escapeHtml(service.office)} · ফি: ${escapeHtml(service.fee || "—")} · সময়: ${escapeHtml(service.days || "—")}</p>
        </div>
      </div>
      <div class="banner banner-info mt-2"><span>ℹ️</span><div>${escapeHtml(schema.intro)}</div></div>
    </div>

    <form id="application-form" novalidate>
      <div class="card card-pad" style="margin-bottom:1.2rem">
        <h2 style="font-size:1.1rem">আবেদনকারীর তথ্য (প্রোফাইল থেকে)</h2>
        <div class="grid grid-2">
          <div class="field">
            <label>পূর্ণ নাম</label>
            <input class="input" id="ap-name" value="${escapeHtml(user.full_name || user.name || "")}" readonly />
          </div>
          <div class="field">
            <label>মোবাইল</label>
            <input class="input" id="ap-mobile" value="${escapeHtml(user.mobile || "")}" readonly />
          </div>
          <div class="field">
            <label>NID</label>
            <input class="input" id="ap-nid" value="${escapeHtml(user.nid || profile.nid || "")}" placeholder="NID নম্বর" />
            <div class="error-msg">NID লিখুন</div>
          </div>
          <div class="field">
            <label>ঠিকানা</label>
            <input class="input" id="ap-address" value="${escapeHtml(user.address || profile.address || "")}" placeholder="বর্তমান ঠিকানা" />
          </div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:1.2rem">
        <h2 style="font-size:1.1rem">সেবা সংক্রান্ত তথ্য</h2>
        ${schema.fields.map(fieldHtml).join("")}
      </div>

      <div class="card card-pad" style="margin-bottom:1.2rem">
        <h2 style="font-size:1.1rem">প্রয়োজনীয় কাগজপত্র</h2>
        <p class="text-muted text-sm">নিচের কাগজগুলো প্রস্তুত রাখুন (ডেমোতে আপলোড প্রযোজ্য নয়):</p>
        <ul class="doc-list">
          ${(service.docs || []).map((d) => `<li>📎 ${escapeHtml(d)}</li>`).join("")}
        </ul>
        <h2 style="font-size:1.1rem;margin-top:1.2rem">ঘোষণা</h2>
        ${(schema.declarations || []).map((d, i) => `
          <label class="checkbox-row" style="margin-bottom:.5rem">
            <input type="checkbox" class="declaration" data-decl="${i}" /> ${escapeHtml(d)}
          </label>`).join("")}
        <div class="field" id="declaration-field"><div class="error-msg">সব ঘোষণায় সম্মতি দিন</div></div>
      </div>

      <div style="display:flex;gap:.7rem">
        <a class="btn btn-ghost" href="services.html">← বাতিল</a>
        <button class="btn btn-primary btn-block btn-lg" type="submit" id="btn-submit">📨 আবেদন জমা দিন</button>
      </div>
    </form>`;

  /* input behaviours */
  schema.fields.forEach((f) => {
    const input = document.getElementById(`fld-${f.name}`);
    if (!input) return;
    if (f.mobile) input.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/[^\d]/g, "")));
    if (f.type === "number") input.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/[^0-9০-৯]/g, "")));
    if (f.english) input.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/[^A-Za-z .'-]/g, "")));
  });

  document.getElementById("application-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    let ok = true;

    /* service-specific required fields */
    schema.fields.forEach((f) => {
      if (!f.required) return;
      const input = document.getElementById(`fld-${f.name}`);
      const field = input.closest(".field");
      let valid = !!input.value.trim();
      if (valid && f.mobile && !isValidBdMobile(input.value)) valid = false;
      if (valid && f.type === "number" && f.min != null && parseNumber(input.value) < f.min) valid = false;
      field.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });

    /* NID */
    const nid = document.getElementById("ap-nid");
    const nidField = nid.closest(".field");
    const nidOk = /^\d{10}$|^\d{13}$|^\d{17}$/.test(nid.value.trim());
    nidField.classList.toggle("invalid", !nidOk);
    if (!nidOk) ok = false;

    /* declarations */
    const decls = document.querySelectorAll(".declaration");
    const allDecl = [...decls].every((c) => c.checked);
    document.getElementById("declaration-field").classList.toggle("invalid", !allDecl);
    if (!allDecl) ok = false;

    if (!ok) {
      toast("ফর্মের আবশ্যক তথ্যগুলো সঠিকভাবে পূরণ করুন", "error");
      return;
    }

    const formData = {
      full_name: document.getElementById("ap-name").value,
      mobile: document.getElementById("ap-mobile").value,
      nid: nid.value.trim(),
      address: document.getElementById("ap-address").value.trim(),
    };
    schema.fields.forEach((f) => {
      formData[f.name] = document.getElementById(`fld-${f.name}`).value.trim();
    });

    const btn = document.getElementById("btn-submit");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> জমা হচ্ছে…`;
    try {
      const app = await MyGovBackend.applyService(service, formData);
      renderSuccess(service, app);
    } catch (err) {
      toast(err.message || "আবেদন জমা দেওয়া যায়নি", "error", 6000);
      btn.disabled = false;
      btn.textContent = "📨 আবেদন জমা দিন";
    }
  });
});

function renderSuccess(service, app) {
  root.innerHTML = `
    <div class="card card-pad">
      <div class="success-screen">
        <div class="success-check">✓</div>
        <h2>আবেদন সফলভাবে জমা হয়েছে</h2>
        <p class="text-muted">${escapeHtml(service.name)} — আপনার আবেদনটি <b>${escapeHtml(service.office)}</b>-এ প্রক্রিয়াধীন থাকবে।</p>
        <div class="summary-box">
          <div class="row"><span>ট্র্যাকিং নম্বর</span><b>${escapeHtml(app.tracking_no)}</b></div>
          <div class="row"><span>সেবা</span><b>${escapeHtml(service.name)}</b></div>
          <div class="row"><span>ফি</span><b>${escapeHtml(service.fee || "—")}</b></div>
          <div class="row"><span>অবস্থা</span><b>${MyGovBackend.STATUS_LABELS.submitted}</b></div>
        </div>
        <p class="text-sm text-muted">📱 এই ট্র্যাকিং নম্বরটি সংরক্ষণ করুন — <a href="track.html">আবেদন ট্র্যাকিং</a> পেজে মোবাইল নম্বরসহ দিয়ে অগ্রগতি দেখা যাবে।</p>
        <div style="display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap;margin-top:1rem">
          <a class="btn btn-primary" href="dashboard.html">ড্যাশবোর্ডে যান</a>
          <a class="btn btn-outline" href="services.html">অন্য সেবায় আবেদন</a>
        </div>
      </div>
    </div>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
