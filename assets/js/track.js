/* ============================================================
 * track.js — application status tracking
 * ============================================================ */

const el = (id) => document.getElementById(id);

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : toBnDigits(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
}

function buildTimeline(app) {
  if (app.timeline?.length) return app.timeline;
  const order = ["submitted", "processing", "delivered"];
  const labels = { submitted: "আবেদন জমা হয়েছে", processing: "দপ্তরে প্রক্রিয়াধীন", delivered: "সেবা বিতরণ হয়েছে" };
  const idx = order.indexOf(app.status);
  return order.map((status, i) => ({
    status,
    label: labels[status],
    date: i === 0 ? app.created_at : i <= idx ? app.updated_at || app.created_at : null,
  }));
}

document.addEventListener("DOMContentLoaded", async () => {
  el("mobile").addEventListener("input", (e) => (e.target.value = e.target.value.replace(/[^\d]/g, "")));

  /* quick-fill for logged-in users */
  const user = await MyGovBackend.currentUser();
  if (user) {
    try {
      const apps = await MyGovBackend.listApplications();
      if (apps.length) {
        el("my-apps").hidden = false;
        el("my-apps-list").innerHTML = apps
          .slice(0, 5)
          .map(
            (a) => `
          <button class="doc-item" style="width:100%;text-align:left;cursor:pointer" data-track="${escapeHtml(a.tracking_no)}" data-mobile="${escapeHtml((user.mobile || "").replace(/^\+88\s?/, ""))}">
            <span class="doc-icon">📄</span>
            <span class="doc-meta"><b>${escapeHtml(a.service_name)}</b><small>${escapeHtml(a.tracking_no)} · ${statusLabel(a.status)}</small></span>
            <span>→</span>
          </button>`
          )
          .join("");
        $$("[data-track]").forEach((b) =>
          b.addEventListener("click", () => {
            el("tracking").value = b.dataset.track;
            if (b.dataset.mobile) el("mobile").value = b.dataset.mobile;
          })
        );
      }
    } catch (_) { /* non-blocking */ }
  }

  el("track-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const mobile = el("mobile");
    const tracking = el("tracking");
    let ok = true;
    mobile.closest(".field").classList.toggle("invalid", !isValidBdMobile(mobile.value));
    if (!isValidBdMobile(mobile.value)) ok = false;
    tracking.closest(".field").classList.toggle("invalid", !tracking.value.trim());
    if (!tracking.value.trim()) ok = false;
    if (!ok) return;

    const btn = el("btn-track");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> খোঁজা হচ্ছে…`;
    try {
      const app = await MyGovBackend.trackApplication({ mobile: mobile.value, trackingNo: tracking.value });
      renderResult(app, mobile.value);
    } catch (err) {
      el("result-card").hidden = true;
      toast(err.message || "আবেদন পাওয়া যায়নি", "error", 6000);
    } finally {
      btn.disabled = false;
      btn.textContent = "🔍 অনুসন্ধান করুন";
    }
  });
});

function renderResult(app, mobile) {
  el("r-service").textContent = app.service_name;
  el("r-office").textContent = app.office || "—";
  el("r-tracking").textContent = app.tracking_no;
  el("r-date").textContent = fmtDate(app.created_at);
  el("r-mobile").textContent = app.applicant_mobile ? `+${app.applicant_mobile}` : mobile;
  const badge = el("r-status");
  badge.className = `status-badge st-${app.status}`;
  badge.textContent = statusLabel(app.status);

  const timeline = buildTimeline(app);
  const lastDone = timeline.filter((t) => t.date).length - 1;
  el("r-timeline").innerHTML = timeline
    .map((t, i) => {
      const cls = t.date ? (i === lastDone ? "current" : "done") : "";
      return `<li class="${cls}"><b>${t.label}</b><span class="t-date">${t.date ? fmtDate(t.date) : "অপেক্ষমাণ"}</span></li>`;
    })
    .join("");

  el("result-card").hidden = false;
  safeScrollIntoView(el("result-card"));
}
