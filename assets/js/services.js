/* ============================================================
 * services.js — searchable service directory + apply flow
 * ============================================================ */

const params = new URLSearchParams(location.search);
const filters = {
  q: params.get("q") || "",
  sector: params.get("sector") || "",
  recipient: params.get("recipient") || "",
};

const el = (id) => document.getElementById(id);

let SERVICES_LIVE = [];

document.addEventListener("DOMContentLoaded", async () => {
  el("service-query").value = filters.q;

  // Live service catalogue (admin-editable); static list as fallback
  try {
    const live = await MyGovBackend.listServices();
    SERVICES_LIVE = live.length ? live : SERVICES;
  } catch {
    SERVICES_LIVE = SERVICES;
  }

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
    const s = SERVICES_LIVE.find((x) => x.id === directId);
    if (s) openModal(s);
  }
});

function filtered() {
  const q = filters.q.toLowerCase();
  return SERVICES_LIVE.filter((s) => {
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
    <div style="display:flex;gap:.7rem;margin-top:1.2rem;flex-wrap:wrap">
      <button class="btn btn-primary" id="btn-apply">📝 আবেদন করুন</button>
      <button class="btn btn-ghost" id="btn-modal-close">বন্ধ করুন</button>
    </div>`;
  el("btn-modal-close").addEventListener("click", closeModal);
  el("btn-apply").addEventListener("click", () => {
    location.href = `apply.html?id=${encodeURIComponent(s.id)}`;
  });
  el("modal-backdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  el("modal-backdrop").classList.remove("open");
  document.body.style.overflow = "";
}
