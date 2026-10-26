/* ============================================================
 * services.js — searchable service directory + apply flow
 * ============================================================ */

const params = new URLSearchParams(location.search);
const filters = {
  q: params.get("q") || "",
  sector: params.get("sector") || "",
  recipient: params.get("recipient") || "",
};
let currentUser = null;

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await MyGovBackend.currentUser();
  el("service-query").value = filters.q;

  /* sector chips */
  el("sector-chips").innerHTML =
    `<button class="chip ${!filters.sector ? "active" : ""}" data-sector="">সব খাত</button>` +
    SERVICE_SECTORS.map(
      (s) => `<button class="chip ${filters.sector === s.id ? "active" : ""}" data-sector="${s.id}">${s.icon} ${s.name}</button>`
    ).join("");
  $$("[data-sector]").forEach((b) =>
    b.addEventListener("click", () => {
      filters.sector = b.dataset.sector;
      $$("[data-sector]").forEach((x) => x.classList.toggle("active", x === b));
      render();
    })
  );

  /* recipient chips */
  el("recipient-chips").innerHTML =
    `<button class="chip ${!filters.recipient ? "active" : ""}" data-recipient="">সবাই</button>` +
    RECIPIENTS.map(
      (r) => `<button class="chip ${filters.recipient === r.id ? "active" : ""}" data-recipient="${r.id}">${r.icon} ${r.name}</button>`
    ).join("");
  $$("[data-recipient]").forEach((b) =>
    b.addEventListener("click", () => {
      filters.recipient = b.dataset.recipient;
      $$("[data-recipient]").forEach((x) => x.classList.toggle("active", x === b));
      render();
    })
  );

  el("service-search").addEventListener("submit", (e) => {
    e.preventDefault();
    filters.q = el("service-query").value.trim();
    render();
  });
  el("service-query").addEventListener("input", (e) => {
    filters.q = e.target.value.trim();
    render();
  });

  el("modal-close").addEventListener("click", closeModal);
  el("modal-backdrop").addEventListener("click", (e) => {
    if (e.target === el("modal-backdrop")) closeModal();
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());

  render();

  const directId = params.get("service");
  if (directId) {
    const s = SERVICES.find((x) => x.id === directId);
    if (s) openModal(s);
  }
});

function filtered() {
  const q = filters.q.toLowerCase();
  return SERVICES.filter((s) => {
    if (filters.sector && s.sector !== filters.sector) return false;
    if (filters.recipient && s.recipient !== filters.recipient) return false;
    if (!q) return true;
    const hay = `${s.name} ${s.office} ${sectorName(s.sector)} ${s.desc}`.toLowerCase();
    return hay.includes(q);
  });
}

function render() {
  const list = filtered();
  el("result-count").textContent = `${toBnDigits(list.length)} টি সেবা পাওয়া গেছে`;
  el("empty-state").hidden = list.length > 0;
  el("service-grid").innerHTML = list
    .map(
      (s) => `
    <article class="service-card" data-open="${s.id}">
      <span class="service-icon">${sectorIcon(s.sector)}</span>
      <h3>${s.name}</h3>
      <p class="text-sm text-muted" style="margin:0">${s.office}</p>
      <div class="meta-row" style="margin:.4rem 0 0">
        <span class="meta-pill">💵 ${s.fee}</span>
        <span class="meta-pill">⏱️ ${s.days}</span>
      </div>
      <span class="count">${sectorName(s.sector)}</span>
    </article>`
    )
    .join("");
  $$("[data-open]").forEach((card) =>
    card.addEventListener("click", () => openModal(SERVICES.find((s) => s.id === card.dataset.open)))
  );
}

function openModal(s) {
  el("modal-title").textContent = s.name;
  el("modal-body").innerHTML = `
    <p>${s.desc}</p>
    <div class="meta-row">
      <span class="meta-pill">🏢 ${s.office}</span>
      <span class="meta-pill">💵 ফি: ${s.fee}</span>
      <span class="meta-pill">⏱️ সময়: ${s.days}</span>
      <span class="meta-pill">👤 ${RECIPIENTS.find((r) => r.id === s.recipient)?.name || "নাগরিক"}</span>
    </div>
    <h4 style="margin-top:1rem">প্রয়োজনীয় কাগজপত্র</h4>
    <ul class="doc-list">
      ${s.docs.map((d) => `<li>📎 ${d}</li>`).join("")}
    </ul>
    <div id="apply-result"></div>
    <div style="display:flex;gap:.7rem;margin-top:1.2rem;flex-wrap:wrap">
      <button class="btn btn-primary" id="btn-apply">📝 আবেদন করুন</button>
      <button class="btn btn-ghost" id="btn-modal-close">বন্ধ করুন</button>
    </div>`;
  el("btn-modal-close").addEventListener("click", closeModal);
  el("btn-apply").addEventListener("click", () => apply(s));
  el("modal-backdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  el("modal-backdrop").classList.remove("open");
  document.body.style.overflow = "";
}

async function apply(service) {
  if (!currentUser) {
    toast("আবেদনের জন্য আগে লগইন করুন", "error");
    setTimeout(() => (location.href = "login.html?next=services.html"), 900);
    return;
  }
  const btn = el("btn-apply");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> জমা হচ্ছে…`;
  try {
    const app = await MyGovBackend.applyService({
      name: service.name,
      sector: sectorName(service.sector),
      office: service.office,
      fee: service.fee,
    });
    toast("আবেদন জমা হয়েছে — ট্র্যাকিং নম্বর সংরক্ষণ করুন", "success", 6000);
    el("apply-result").innerHTML = `
      <div class="banner banner-success" style="margin-top:1rem">
        <span>✅</span>
        <div>
          <b>আবেদন সফলভাবে জমা হয়েছে</b><br />
          ট্র্যাকিং নম্বর: <code>${app.tracking_no}</code>
        </div>
      </div>`;
    btn.hidden = true;
    el("btn-modal-close").textContent = "ড্যাশবোর্ডে যান";
    el("btn-modal-close").classList.remove("btn-ghost");
    el("btn-modal-close").classList.add("btn-outline");
    el("btn-modal-close").onclick = () => (location.href = "dashboard.html");
  } catch (err) {
    toast(err.message || "আবেদন জমা দেওয়া যায়নি", "error");
    btn.disabled = false;
    btn.textContent = "📝 আবেদন করুন";
  }
}
