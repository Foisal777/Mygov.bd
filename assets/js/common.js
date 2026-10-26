/* ============================================================
 * common.js — shared UI: header, footer, a11y toolbar, toasts,
 * validation helpers, auth guard
 * ============================================================ */

/* ---------- tiny helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
function toBnDigits(input) {
  return String(input).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
}
// Parse a value that may contain Bengali numerals (e.g. "১৫" -> 15)
function parseNumber(input) {
  const bnMap = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
  const ascii = String(input ?? "").replace(/[০-৯]/g, (d) => bnMap[d]).replace(/[^\d.-]/g, "");
  const n = Number(ascii);
  return Number.isFinite(n) ? n : NaN;
}
function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "ইউ";
}
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
// Bangladeshi mobile: 01[3-9] followed by 8 digits (10 total)
function isValidBdMobile(v) {
  return /^01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ""));
}
// English letters, spaces, dots, hyphens only (myGov asks for English name)
function isValidEnglishName(v) {
  return /^[A-Za-z][A-Za-z .'-]{2,}$/.test(v.trim());
}
// Normalize 01712... / +8801712... / 8801712 -> 8801712...
function normalizeMobile(v, cc = "+88") {
  let digits = v.replace(/\D/g, "");
  const ccDigits = cc.replace(/\D/g, "");
  if (ccDigits === "880" || ccDigits === "88") {
    if (digits.startsWith("880")) digits = digits;
    else if (digits.startsWith("0")) digits = "880" + digits.slice(1);
    else if (!digits.startsWith("880")) digits = "880" + digits;
  }
  return digits;
}

/* ---------- toasts ---------- */
function toast(message, type = "info", timeout = 3800) {
  let stack = $(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(() => el.remove(), 320);
  }, timeout);
}

/* ---------- header / footer ---------- */
const NAV_LINKS = [
  { href: "index.html", label: "হোম", en: "Home", key: "home" },
  { href: "services.html", label: "সেবা সমূহ", en: "Services", key: "services" },
  { href: "track.html", label: "আবেদন ট্র্যাকিং", en: "Track Application", key: "track" },
  { href: "dashboard.html", label: "ড্যাশবোর্ড", en: "Dashboard", key: "dashboard", auth: true },
  { href: "profile.html", label: "প্রোফাইল", en: "Profile", key: "profile", auth: true },
];

function brandSvg(size = 52) {
  return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="myGov demo logo">
    <circle cx="32" cy="32" r="30" fill="#006a4e"/>
    <circle cx="32" cy="32" r="30" fill="none" stroke="#004633" stroke-width="2"/>
    <path d="M20 44V20h6l12 15V20h6v24h-6L26 29v15z" fill="#fff"/>
    <circle cx="46" cy="18" r="5.5" fill="#d9382e"/>
  </svg>`;
}

async function renderChrome() {
  const user = await MyGovBackend.currentUser();
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const header = $("#site-header");
  if (header) {
    header.innerHTML = `
      <div class="top-strip">
        <div class="container">
          <div>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · <span class="bn-en">People's Republic of Bangladesh</span></div>
          <div class="strip-right">
            <span>📞 হেল্পলাইন: <b>৩৩৩</b></span>
            <button class="strip-btn" id="a11y-open-top" type="button">♿ অ্যাক্সেসিবিলিটি</button>
          </div>
        </div>
      </div>
      <header class="site-header">
        <div class="container header-main">
          <a class="brand" href="index.html">
            ${brandSvg()}
            <span class="brand-text">
              <b>myGov <span style="font-weight:600">মাইগভ</span></b>
              <span>এক ঠিকানায় সরকারি সেবা <span class="bn-en">| One-stop government services</span></span>
            </span>
          </a>
          <button class="nav-toggle" id="nav-toggle" aria-label="Menu">☰</button>
          <div class="header-actions">
            ${
              user
                ? `<a class="user-chip" href="profile.html">
                     <span class="avatar">${escapeHtml(initials(user.full_name || user.name || ""))}</span>
                     <span class="text-sm"><b>${escapeHtml(user.full_name || user.name || "নাগরিক")}</b></span>
                   </a>
                   <button class="btn btn-ghost btn-sm" id="logout-btn" type="button">লগআউট</button>`
                : `<a class="btn btn-outline btn-sm" href="login.html"><span class="label">লগইন</span></a>
                   <a class="btn btn-primary btn-sm" href="registration.html"><span class="label">রেজিস্ট্রেশন</span></a>`
            }
          </div>
        </div>
        <nav class="main-nav" id="main-nav">
          <div class="container">
            ${NAV_LINKS.filter((l) => !l.auth || user)
              .map(
                (l) =>
                  `<a href="${l.href}" class="${page === l.href ? "active" : ""}">${l.label} <span class="bn-en">${l.en}</span></a>`
              )
              .join("")}
          </div>
        </nav>
      </header>`;

    // Mobile nav toggle
    const navToggle = $("#nav-toggle");
    const mainNav = $("#main-nav");
    navToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      mainNav?.classList.toggle("open");
    });
    // Close mobile nav when clicking a link inside it
    mainNav?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => mainNav.classList.remove("open"));
    });
    // Close mobile nav when clicking outside
    document.addEventListener("click", (e) => {
      if (mainNav?.classList.contains("open") && !e.target.closest(".site-header")) {
        mainNav.classList.remove("open");
      }
    });
    $("#a11y-open-top")?.addEventListener("click", () => $("#a11y-panel").classList.add("open"));
    $("#logout-btn")?.addEventListener("click", async () => {
      await MyGovBackend.logout();
      toast("আপনি লগআউট হয়েছেন", "success");
      location.href = "index.html";
    });
  }

  const footer = $("#site-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="demo-disclaimer">
        ⚠️ ডেমো প্রজেক্ট — শিক্ষামূলক ও পরীক্ষামূলক ব্যবহারের জন্য তৈরি। এটি সরকারি myGov (mygov.bd) পোর্টাল নয় এবং কোনো প্রকৃত সরকারি সেবা প্রদান করে না।
      </div>
      <div class="container footer-top">
        <div>
          <div class="brand" style="margin-bottom:.8rem">
            ${brandSvg(44)}
            <span class="brand-text"><b style="color:#fff">myGov মাইগভ</b><span style="color:#9ec7b6">এক ঠিকানায় সরকারি সেবা</span></span>
          </div>
          <p>নাগরিক, ব্যবসায়ী ও সরকারি কর্মকর্তাদের জন্য সমন্বিত ডিজিটাল সরকারি সেবা প্ল্যাটফর্মের একটি ডেমো।</p>
        </div>
        <div>
          <h4>দ্রুত লিংক</h4>
          <a href="services.html">সেবা খাত সমূহ</a>
          <a href="track.html">আবেদন ট্র্যাকিং</a>
          <a href="registration.html">নতুন একাউন্ট</a>
          <a href="login.html">নাগরিক লগইন</a>
          <a href="admin/login.html">🛡️ অ্যাডমিন প্যানেল</a>
        </div>
        <div>
          <h4>সেবা খাত</h4>
          <a href="services.html">সনদ ও প্রত্যয়ন</a>
          <a href="services.html">শিক্ষা</a>
          <a href="services.html">ভূমি ও ইজারা</a>
          <a href="services.html">অনুদান, ভাতা ও ঋণ</a>
        </div>
        <div>
          <h4>যোগাযোগ / সহায়তা</h4>
          <a href="tel:333">📞 ৩৩৩ — সরকারি তথ্য ও সেবা</a>
          <a href="tel:+8801550060060">📞 +৮৮০ ১৫৫০ ০৬০০৬০</a>
          <a href="tel:+8801572051952">📞 +৮৮০ ১৫৭২ ০৫১৯৫২</a>
          <a href="mailto:support@example-demo.test">✉️ support@example-demo.test</a>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.6rem;width:100%">
          <span>© ${new Date().getFullYear()} myGov Demo — Netlify + Supabase দিয়ে তৈরি</span>
          <span>গোপনীয়তা নীতি · ব্যবহারের শর্তাবলী · সাইটম্যাপ</span>
        </div>
      </div>`;
  }

  renderA11yWidget();
  registerShortcuts();
}

/* ---------- accessibility widget ---------- */
const A11Y_CLASSES = ["a11y-font-lg", "a11y-font-xl", "a11y-monochrome", "a11y-invert", "a11y-highlight-links", "a11y-big-cursor"];
function renderA11yWidget() {
  if ($("#a11y-widget")) return;
  const saved = JSON.parse(localStorage.getItem("mygov_a11y") || "[]");
  saved.forEach((c) => document.body.classList.add(c));

  const wrap = document.createElement("div");
  wrap.id = "a11y-widget";
  wrap.innerHTML = `
    <button class="a11y-fab" id="a11y-fab" aria-label="Accessibility menu">♿</button>
    <div class="a11y-panel" id="a11y-panel">
      <h4>অ্যাক্সেসিবিলিটি টুল <span class="bn-en">Accessibility</span></h4>
      <div class="a11y-grid">
        <button data-a11y="a11y-font-lg">A+ বড় ফন্ট</button>
        <button data-a11y="a11y-font-xl">A++ আরও বড়</button>
        <button data-a11y="a11y-monochrome">গ্রেস্কেল</button>
        <button data-a11y="a11y-invert">কালার ইনভার্ট</button>
        <button data-a11y="a11y-highlight-links">লিংক হাইলাইট</button>
        <button data-a11y="a11y-big-cursor">বড় কার্সর</button>
        <button data-a11y="__reset" class="wide">↺ রিসেট</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  $("#a11y-fab").addEventListener("click", () => $("#a11y-panel").classList.toggle("open"));
  $$("[data-a11y]", wrap).forEach((btn) => {
    const cls = btn.dataset.a11y;
    if (cls !== "__reset") btn.classList.toggle("on", document.body.classList.contains(cls));
    btn.addEventListener("click", () => {
      if (cls === "__reset") {
        A11Y_CLASSES.forEach((c) => document.body.classList.remove(c));
      } else if (cls.startsWith("a11y-font")) {
        A11Y_CLASSES.filter((c) => c.startsWith("a11y-font")).forEach((c) => document.body.classList.remove(c));
        document.body.classList.add(cls);
      } else {
        document.body.classList.toggle(cls);
      }
      localStorage.setItem("mygov_a11y", JSON.stringify(A11Y_CLASSES.filter((c) => document.body.classList.contains(c))));
      $$("[data-a11y]", wrap).forEach((b) => {
        if (b.dataset.a11y !== "__reset") b.classList.toggle("on", document.body.classList.contains(b.dataset.a11y));
      });
    });
  });
}

/* ---------- keyboard shortcuts (mirrors real myGov) ---------- */
function registerShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!e.altKey) return;
    const map = {
      l: "login.html",
      r: "registration.html",
      f: "forgot-password.html",
      s: "services.html",
      d: "dashboard.html",
      t: "track.html",
      1: "index.html",
    };
    const target = map[e.key.toLowerCase()];
    if (target) {
      e.preventDefault();
      location.href = target;
    }
  });
}

/* ---------- auth guard for protected pages ---------- */
async function requireAuth(redirect = "login.html") {
  const user = await MyGovBackend.currentUser();
  if (!user) {
    toast("এই পেজের জন্য লগইন প্রয়োজন", "error");
    location.href = `${redirect}?next=${encodeURIComponent(location.pathname.split("/").pop())}`;
    return null;
  }
  return user;
}

/* ---------- safe scroll (no-op in environments without it) ---------- */
function safeScrollTo(top = 0) {
  try { window.scrollTo({ top, behavior: "smooth" }); } catch { /* ignore */ }
}
function safeScrollIntoView(node) {
  try { node && typeof node.scrollIntoView === "function" && node.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* ignore */ }
}

/* ---------- FAQ accordion (used on home) ---------- */
function initFaq(root = document) {
  $$(".faq-item", root).forEach((item) => {
    const q = $(".faq-q", item);
    const a = $(".faq-a", item);
    q?.addEventListener("click", () => {
      const open = item.classList.contains("open");
      $$(".faq-item.open", root).forEach((i) => {
        i.classList.remove("open");
        $(".faq-a", i).style.maxHeight = null;
      });
      if (!open) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", renderChrome);
