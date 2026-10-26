/* ============================================================
 * home.js — homepage renderers
 * ============================================================ */

const OFFICES = [
  { name: "পররাষ্ট্র মন্ত্রণালয়", icon: "🌐" },
  { name: "স্থানীয় সরকার বিভাগ", icon: "🏘️" },
  { name: "জাতীয় রাজস্ব বোর্ড (NBR)", icon: "🧾" },
  { name: "সমাজসেবা অধিদপ্তর", icon: "🤝" },
  { name: "বাংলাদেশ পুলিশ", icon: "🛡️" },
  { name: "ভূমি মন্ত্রণালয়", icon: "📐" },
  { name: "কৃষি সম্প্রসারণ অধিদপ্তর", icon: "🌾" },
  { name: "ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর", icon: "🛂" },
  { name: "শিক্ষা মন্ত্রণালয়", icon: "🎓" },
];

const LINKED_SERVICES = [
  { icon: "💧", name: "পানির বিল" },
  { icon: "⚡", name: "বিদ্যুৎ বিল" },
  { icon: "☎️", name: "টেলিফোন বিল" },
  { icon: "🔥", name: "গ্যাস বিল" },
  { icon: "🚆", name: "রেলওয়ে টিকেট" },
  { icon: "🛂", name: "পাসপোর্ট" },
  { icon: "🧾", name: "টিন সার্টিফিকেট" },
  { icon: "🪪", name: "এন আই ডি" },
  { icon: "🏦", name: "ই-পেমেন্ট" },
];

const FAQS = [
  {
    q: "মাইগভ-এ কিভাবে রেজিস্ট্রেশন করা যাবে?",
    a: "হোমপেজ থেকে ‘রেজিস্ট্রেশন’ বাটনে ক্লিক করুন। মোবাইল বা ইমেইল ট্যাব বেছে নিয়ে ইংরেজিতে নাম ও মোবাইল নম্বর লিখুন। রেজিস্ট্রেশন করুন-এ ক্লিক করলে ৬ সংখ্যার OTP যাবে; OTP যাচাইয়ের পর পাসওয়ার্ড নির্ধারণ করলেই একাউন্ট তৈরি হবে।",
  },
  {
    q: "মাইগভ প্রোফাইলে কি তথ্য ও ডকুমেন্টস সংরক্ষণ করা যাবে?",
    a: "ছবি, জাতীয় পরিচয়পত্র, পাসপোর্ট, জন্ম নিবন্ধন সনদ, টিন সার্টিফিকেট, স্বাক্ষর ও শিক্ষাগত সনদ প্রোফাইলে সংরক্ষণ করা যায়। আবেদনের সময় এই তথ্য স্বয়ংক্রিয়ভাবে ফরমে যুক্ত হয়।",
  },
  {
    q: "আবেদনের সর্বশেষ অবস্থা কিভাবে জানব?",
    a: "মোবাইল নম্বর ও ট্র্যাকিং নম্বর দিয়ে ‘আবেদন ট্র্যাকিং’ পেজ থেকে অথবা লগইন করে ড্যাশবোর্ড থেকে সব আবেদনের সর্বশেষ অগ্রগতি দেখা যায়।",
  },
  {
    q: "সরকারি সেবা গ্রহণে মাইগভ একাউন্ট কি বাধ্যতামূলক?",
    a: "অধিকাংশ অনলাইন সেবার ক্ষেত্রে সেবা প্রদানকারী দপ্তর মাইগভ একাউন্ট বাধ্যতামূলক করেছে। কোনো কোনো ক্ষেত্রে একাউন্ট ছাড়াও আবেদন করা যায়।",
  },
  {
    q: "মাইগভ-এ কিভাবে লগইন করা যাবে?",
    a: "‘নাগরিক লগইন’-এ গিয়ে রেজিস্ট্রেশন করা মোবাইল নম্বর বা ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করুন। পাসওয়ার্ড ভুলে গেলে OTP দিয়ে পুনরুদ্ধার করা যায়।",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  /* sector grid */
  $("#sector-grid").innerHTML = SERVICE_SECTORS.map(
    (s) => `
    <a class="service-card" href="services.html?sector=${encodeURIComponent(s.id)}">
      <span class="service-icon">${s.icon}</span>
      <h3>${s.name}</h3>
      <span class="count">${toBnDigits(s.count)} টি সেবা</span>
    </a>`
  ).join("");

  /* office grid */
  $("#office-grid").innerHTML = OFFICES.map(
    (o) => `
    <a class="service-card" href="services.html?q=${encodeURIComponent(o.name)}">
      <span class="service-icon">${o.icon}</span>
      <h3>${o.name}</h3>
      <span class="count">মন্ত্রণালয়/দপ্তর ভিত্তিক সেবা</span>
    </a>`
  ).join("");

  /* recipient grid */
  $("#recipient-grid").innerHTML = RECIPIENTS.map(
    (r) => `
    <a class="service-card" href="services.html?recipient=${encodeURIComponent(r.id)}">
      <span class="service-icon">${r.icon}</span>
      <h3>${r.name}</h3>
      <span class="count">${r.en}</span>
    </a>`
  ).join("");

  /* linked services */
  $("#linked-items").innerHTML = LINKED_SERVICES.map(
    (l) => `<a class="linked-item" href="#" data-linked="${l.name}"><span class="li-icon">${l.icon}</span>${l.name}</a>`
  ).join("");
  $$("[data-linked]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      toast(`‘${a.dataset.linked}’ লিংকড সেবা — ডেমোতে বহিরাগত লিংক অকার্যকর`, "info");
    })
  );

  /* popular services */
  $("#popular-grid").innerHTML = SERVICES.filter((s) => s.popular).map(
    (s) => `
    <a class="service-card" href="services.html?service=${encodeURIComponent(s.id)}">
      <span class="service-icon">${sectorIcon(s.sector)}</span>
      <h3>${s.name}</h3>
      <span class="count">${s.office}</span>
    </a>`
  ).join("");

  /* FAQ */
  $("#faq-list").innerHTML = FAQS.map(
    (f, i) => `
    <div class="faq-item">
      <button class="faq-q" type="button">${f.q} <span class="chev">▾</span></button>
      <div class="faq-a"><div>${f.a}</div></div>
    </div>`
  ).join("");
  initFaq();

  /* home tabs */
  $$("[data-home-tab]").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$("[data-home-tab]").forEach((b) => b.classList.toggle("active", b === btn));
      const t = btn.dataset.homeTab;
      $$("[data-home-pane]").forEach((p) => (p.hidden = p.dataset.homePane !== t));
    })
  );

  /* hero search */
  $("#hero-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#hero-query").value.trim();
    location.href = q ? `services.html?q=${encodeURIComponent(q)}` : "services.html";
  });

  /* chat fab */
  $("#chat-fab").addEventListener("click", () =>
    toast("মাইগভ সহায়ক চ্যাটবট এই ডেমোতে সংযুক্ত নয় — হেল্পলাইন ৩৩৩ এ কল করুন", "info", 5000)
  );
});
