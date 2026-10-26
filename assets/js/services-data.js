/* ============================================================
 * services-data.js — demo service catalogue modelled on the
 * sectors / recipient types published on mygov.bd
 * ============================================================ */

const SERVICE_SECTORS = [
  { id: "sec-65", name: "বিদেশগামী নাগরিকদের সার্টিফিকেট সত্যায়ন", en: "Attestation", icon: "📜", count: 41, recipients: ["citizen", "business"] },
  { id: "sec-59", name: "কৃষি ও সার", en: "Agriculture & Fertilizer", icon: "🌾", count: 52, recipients: ["citizen", "business"] },
  { id: "sec-19", name: "অভ্যন্তরীণ (সরকারি কর্মকর্তা-কর্মচারী)", en: "Internal (Govt. Officers)", icon: "🏛️", count: 914, recipients: ["officer"] },
  { id: "sec-49", name: "ব্যক্তিগত আবেদন ও অনুমতি", en: "Personal Applications", icon: "📝", count: 123, recipients: ["citizen"] },
  { id: "sec-3", name: "সনদ, প্রত্যয়ন, অনাপত্তি ও অনুমতি", en: "Certificates & Approvals", icon: "📋", count: 172, recipients: ["citizen", "business"] },
  { id: "sec-4", name: "অনুদান, ভাতা ও ঋণ", en: "Grants, Allowances & Loans", icon: "💰", count: 111, recipients: ["citizen"] },
  { id: "sec-16", name: "শিক্ষা", en: "Education", icon: "🎓", count: 137, recipients: ["citizen"] },
  { id: "sec-1", name: "ভূমি ও ইজারা", en: "Land & Lease", icon: "📐", count: 37, recipients: ["citizen", "business"] },
  { id: "sec-7", name: "নিবন্ধন ও লাইসেন্স", en: "Registration & License", icon: "🔖", count: 86, recipients: ["citizen", "business"] },
  { id: "sec-8", name: "মাইগভ ফর প্রবাসী", en: "myGov for Expatriates", icon: "✈️", count: 58, recipients: ["citizen"] },
  { id: "sec-9", name: "অর্থ ও ব্যাংক", en: "Finance & Banking", icon: "🏦", count: 64, recipients: ["citizen", "business"] },
  { id: "sec-10", name: "মুক্তিযোদ্ধা", en: "Freedom Fighters", icon: "🎖️", count: 29, recipients: ["citizen"] },
  { id: "sec-11", name: "আইন-শৃঙ্খলা ও বিচার", en: "Law, Order & Justice", icon: "⚖️", count: 73, recipients: ["citizen"] },
  { id: "sec-12", name: "অন্যান্য", en: "Others", icon: "⚙️", count: 95, recipients: ["citizen", "business", "officer"] },
];

const RECIPIENTS = [
  { id: "citizen", name: "নাগরিক", en: "Citizen", icon: "👤" },
  { id: "business", name: "ব্যবসায়ী", en: "Business", icon: "🏢" },
  { id: "officer", name: "সরকারি কর্মকর্তা-কর্মচারী", en: "Govt. Officer", icon: "🪪" },
];

const SERVICES = [
  {
    id: "srv-1", name: "বিদেশগামী শিক্ষার্থীদের সার্টিফিকেট সত্যায়ন", sector: "sec-65", office: "পররাষ্ট্র মন্ত্রণালয়",
    fee: "৳ ৫০০", days: "৭ কার্যদিবস", recipient: "citizen", popular: true,
    desc: "বিদেশে উচ্চশিক্ষা বা চাকরির জন্য শিক্ষাগত সনদ ও অন্যান্য কাগজপত্রের সত্যায়ন (অ্যাপোস্টিল)।",
    docs: ["জাতীয় পরিচয়পত্র (NID)", "মূল সনদ ও গ্রেডশিট", "পাসপোর্ট কপি", "পাসপোর্ট সাইজ ছবি"],
  },
  {
    id: "srv-2", name: "জন্ম নিবন্ধন সনদের জন্য আবেদন", sector: "sec-3", office: "স্থানীয় সরকার বিভাগ",
    fee: "বিনামূল্যে", days: "১৫ কার্যদিবস", recipient: "citizen", popular: true,
    desc: "নবজাতক ও প্রাপ্তবয়স্কদের জন্ম নিবন্ধন সনদ ইস্যু ও সংশোধনের আবেদন।",
    docs: ["টিকাদান কার্ড / হাসপাতালের প্রত্যয়ন", "পিতা-মাতার NID", "বাসিন্দা প্রমাণ"],
  },
  {
    id: "srv-3", name: "ট্রেড লাইসেন্স (নতুন / নবায়ন)", sector: "sec-7", office: "সিটি কর্পোরেশন / পৌরসভা",
    fee: "৳ ১,০০০ – ৫,০০০", days: "১০ কার্যদিবস", recipient: "business", popular: true,
    desc: "ব্যবসা প্রতিষ্ঠান পরিচালনার জন্য ট্রেড লাইসেন্স ইস্যু ও বার্ষিক নবায়ন।",
    docs: ["জাতীয় পরিচয়পত্র", "ভাড়ার চুক্তি / মালিকানা দলিল", "হোল্ডিং ট্যাক্স রশিদ", "ছবি"],
  },
  {
    id: "srv-4", name: "টিন সার্টিফিকেট (e-TIN) নিবন্ধন", sector: "sec-9", office: "জাতীয় রাজস্ব বোর্ড (NBR)",
    fee: "বিনামূল্যে", days: "১ কার্যদিবস", recipient: "business", popular: true,
    desc: "আয়কর প্রদান ও ব্যবসায়িক লেনদেনের জন্য ট্যাক্সপেয়ার আইডেন্টিফিকেশন নম্বর।",
    docs: ["জাতীয় পরিচয়পত্র", "মোবাইল নম্বর", "ঠিকানা প্রমাণ"],
  },
  {
    id: "srv-5", name: "বয়স্ক ভাতার আবেদন", sector: "sec-4", office: "সমাজসেবা অধিদপ্তর",
    fee: "বিনামূল্যে", days: "৩০ কার্যদিবস", recipient: "citizen", popular: true,
    desc: "৬৫ বছর বা তদূর্ধ্ব নাগরিকদের মাসিক বয়স্ক ভাতা কর্মসূচিতে অন্তর্ভুক্তি।",
    docs: ["জাতীয় পরিচয়পত্র", "জন্ম নিবন্ধন / বয়স প্রমাণ", "ভোটার এলাকা প্রমাণ"],
  },
  {
    id: "srv-6", name: "জমির নামজারি (মিউটেশন)", sector: "sec-1", office: "ইউনিয়ন ভূমি অফিস",
    fee: "৳ ১,১০০", days: "২১ কার্যদিবস", recipient: "citizen",
    desc: "ক্রয়, উত্তরাধিকার বা হেবা দলিলের পর জমির খতিয়ানে নাম পরিবর্তন।",
    docs: ["মূল দলিল", "খাজনা রশিদ", "পূর্বতন খতিয়ান", "NID", "ওয়ারিশ সনদ (প্রযোজ্য ক্ষেত্রে)"],
  },
  {
    id: "srv-7", name: "সাধারণ ডায়েরি (জিডি)", sector: "sec-11", office: "বাংলাদেশ পুলিশ",
    fee: "বিনামূল্যে", days: "তাৎক্ষণিক", recipient: "citizen", popular: true,
    desc: "হারানো কাগজপত্র, নিরাপত্তা উদ্বেগ বা অভিযোগের সাধারণ ডায়েরি অনলাইনে।",
    docs: ["জাতীয় পরিচয়পত্র", "ঘটনার বিবরণ", "সম্পর্কিত কাগজ (থাকলে)"],
  },
  {
    id: "srv-8", name: "চারিত্রিক প্রত্যয়ন পত্র", sector: "sec-3", office: "ইউনিয়ন পরিষদ / ওয়ার্ড কার্যালয়",
    fee: "৳ ১০০", days: "৩ কার্যদিবস", recipient: "citizen",
    desc: "চাকরি, ভিসা ও শিক্ষাপ্রতিষ্ঠানে ভর্তির জন্য চারিত্রিক ও নাগরিকত্ব প্রত্যয়ন।",
    docs: ["জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন", "ছবি", "বাসিন্দা প্রমাণ"],
  },
  {
    id: "srv-9", name: "বিধবা ও স্বামী নিগৃহীতা মহিলা ভাতা", sector: "sec-4", office: "সমাজসেবা অধিদপ্তর",
    fee: "বিনামূল্যে", days: "৩০ কার্যদিবস", recipient: "citizen",
    desc: "অসচ্ছল বিধবা ও স্বামী-পরিত্যক্তা মহিলাদের জন্য মাসিক ভাতা।",
    docs: ["জাতীয় পরিচয়পত্র", "স্বামীর মৃত্যু নিবন্ধন (প্রযোজ্য ক্ষেত্রে)", "বাসিন্দা প্রমাণ"],
  },
  {
    id: "srv-10", name: "নতুন বিদ্যুৎ সংযোগ আবেদন", sector: "sec-49", office: "বাংলাদেশ বিদ্যুৎ উন্নয়ন বোর্ড",
    fee: "৳ ২,৫০০ থেকে", days: "২১ কার্যদিবস", recipient: "citizen",
    desc: "আবাসিক ও বাণিজ্যিক স্থাপনায় নতুন বিদ্যুৎ সংযোগের অনলাইন আবেদন।",
    docs: ["জাতীয় পরিচয়পত্র", "দলিল / ভাড়ার চুক্তি", "হোল্ডিং ট্যাক্স", "নকশা"],
  },
  {
    id: "srv-11", name: "কৃষি উপকরণ (সার-বীজ) সহায়তা", sector: "sec-59", office: "কৃষি সম্প্রসারণ অধিদপ্তর",
    fee: "ভর্তুকি মূল্য", days: "৭ কার্যদিবস", recipient: "citizen",
    desc: "কৃষকদের জন্য সরকার নির্ধারিত ভর্তুকি মূল্যে সার, বীজ ও কৃষি উপকরণ কার্ড।",
    docs: ["জাতীয় পরিচয়পত্র", "জমির খতিয়ান", "মোবাইল নম্বর"],
  },
  {
    id: "srv-12", name: "পাসপোর্ট আবেদন (MRP / e-Passport)", sector: "sec-8", office: "ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর",
    fee: "৳ ৩,৫০০ – ১১,০০০", days: "১৫–৩০ কার্যদিবস", recipient: "citizen", popular: true,
    desc: "সাধারণ ও জরুরি ডেলিভারিতে মেশিন রিডেবল / ই-পাসপোর্টের আবেদন।",
    docs: ["জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন", "টিন/নাগরিকত্ব সনদ", "ছবি (বায়োমেট্রিক কেন্দ্রে)"],
  },
  {
    id: "srv-13", name: "প্রতিবন্ধী শনাক্তকরণ ও ভাতা", sector: "sec-4", office: "সমাজসেবা অধিদপ্তর",
    fee: "বিনামূল্যে", days: "৩০ কার্যদিবস", recipient: "citizen",
    desc: "প্রতিবন্ধিত্ব শনাক্তকরণ সনদ ও সংশ্লিষ্ট ভাতা কর্মসূচির আবেদন।",
    docs: ["জন্ম নিবন্ধন / NID", "মেডিকেল প্রত্যয়ন", "ছবি"],
  },
  {
    id: "srv-14", name: "মৃত্যু নিবন্ধন সনদ", sector: "sec-3", office: "স্থানীয় সরকার বিভাগ",
    fee: "বিনামূল্যে", days: "১০ কার্যদিবস", recipient: "citizen",
    desc: "মৃত ব্যক্তির নিবন্ধন ও সনদ ইস্যুর আবেদন।",
    docs: ["হাসপাতাল/চিকিৎসকের মৃত্যু প্রত্যয়ন", "ওয়ারিশদের NID", "স্থান প্রমাণ"],
  },
  {
    id: "srv-15", name: "শিক্ষা প্রতিষ্ঠানে ভর্তির আবেদন", sector: "sec-16", office: "মাধ্যমিক ও উচ্চশিক্ষা বিভাগ",
    fee: "বিদ্যালয় নির্ধারিত", days: "বিজ্ঞপ্তি অনুযায়ী", recipient: "citizen",
    desc: "সরকারি স্কুল-কলেজে ডিজিটাল লটারি ভর্তি প্রক্রিয়ার অনলাইন আবেদন।",
    docs: ["জন্ম নিবন্ধন সনদ", "পূর্ববর্তী সনদ", "ছবি"],
  },
  {
    id: "srv-16", name: "অস্ত্রের লাইসেন্সের আবেদন", sector: "sec-11", office: "স্বরাষ্ট্র মন্ত্রণালয়",
    fee: "৳ ৫,০০০+", days: "৬০ কার্যদিবস", recipient: "citizen",
    desc: "আগ্নেয়াস্ত্রের নতুন লাইসেন্স, নবায়ন ও বার্ষিক ফি সংক্রান্ত আবেদন।",
    docs: ["জাতীয় পরিচয়পত্র", "পুলিশ ভেরিফিকেশন ফরম", "আয়কর সনদ", "ছবি"],
  },
  {
    id: "srv-17", name: "নতুন সমবায় সমিতি রেজিস্ট্রেশন", sector: "sec-7", office: "সমবায় অধিদপ্তর",
    fee: "৳ ১,০০০", days: "৩০ কার্যদিবস", recipient: "citizen", popular: true, form: "samity",
    desc: "নতুন সমবায় সমিতি (কৃষি, মৎস্য, বহুমুখী, আবাসন ইত্যাদি) গঠন ও নিবন্ধনের অনলাইন আবেদন।",
    docs: ["উপচেক/প্রস্তাবিত সদস্যদের তালিকা", "সমিতির প্রস্তাবিত উপবিধি", "কার্যকরী কমিটির তালিকা", "সম্পাদকের জাতীয় পরিচয়পত্র", "গঠন সভার কার্যবিবরণী"],
  },
  {
    id: "srv-18", name: "সমবায় সমিতির বার্ষিক রিটার্ন দাখিল", sector: "sec-7", office: "সমবায় অধিদপ্তর",
    fee: "৳ ২০০", days: "৭ কার্যদিবস", recipient: "business", form: "generic",
    desc: "নিবন্ধিত সমবায় সমিতির বার্ষিক হিসাব ও রিটার্ন দাখিল সংক্রান্ত সেবা।",
    docs: ["নিবন্ধন সনদ", "বার্ষিক আর্থিক প্রতিবেদন", "সাধারণ সভার কার্যবিবরণী"],
  },
];

/* Dynamic application form schemas (keyed by service.form) */
const FORM_SCHEMAS = {
  samity: {
    intro: "নতুন সমবায় সমিতি নিবন্ধনের জন্য নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন। আবেদন জমার পর ট্র্যাকিং নম্বর দিয়ে অগ্রগতি দেখা যাবে।",
    fields: [
      { name: "samity_name", label: "সমিতের নাম (প্রস্তাবিত)", type: "text", required: true, placeholder: "যেমন: কল্যাণ বহুমুখী সমবায় সমিতি লিমিটেড" },
      { name: "samity_type", label: "সমিতির ধরন", type: "select", required: true,
        options: ["কৃষি সমবায় সমিতি", "মৎস্য সমবায় সমিতি", "বহুমুখী সমবায় সমিতি", "আবাসন সমবায় সমিতি", "ভোক্তা সমবায় সমিতি", "মহিলা সমবায় সমিতি", "অন্যান্য"] },
      { name: "district", label: "জেলা", type: "text", required: true, placeholder: "যেমন: ঢাকা" },
      { name: "upazila", label: "উপজেলা / থানা", type: "text", required: true },
      { name: "union", label: "ইউনিয়ন / ওয়ার্ড", type: "text", required: false },
      { name: "member_count", label: "প্রস্তাবিত সদস্য সংখ্যা", type: "number", required: true, min: 10, placeholder: "ন্যূনতম ১০ জন" },
      { name: "formation_date", label: "গঠন সভার তারিখ", type: "date", required: true },
      { name: "chairman_name", label: "সভাপতির নাম (ইংরেজিতে)", type: "text", required: true, english: true },
      { name: "secretary_name", label: "সম্পাদকের নাম (ইংরেজিতে)", type: "text", required: true, english: true },
      { name: "secretary_mobile", label: "সম্পাদকের মোবাইল", type: "tel", required: true, mobile: true, placeholder: "01XXXXXXXXX" },
      { name: "objective", label: "সমিতির লক্ষ্য ও কার্যক্রম", type: "textarea", required: true },
    ],
    declarations: [
      "প্রদত্ত সব তথ্য সঠিক ও সত্য",
      "সমিতির উপবিধি সমবায় আইন অনুযায়ী প্রণীত হয়েছে",
      "তথ্য গোপন বা মিথ্যা প্রমাণিত হলে নিবন্ধন বাতিলযোগ্য হবে",
    ],
  },
  generic: {
    intro: "এই সেবার জন্য প্রয়োজনীয় তথ্যগুলো পূরণ করুন। আপনার প্রোফাইলের তথ্য স্বয়ংক্রিয়ভাবে বসানো হয়েছে।",
    fields: [
      { name: "purpose", label: "আবেদনের বিবরণ / উদ্দেশ্য", type: "textarea", required: true },
      { name: "preferred_date", label: "পছন্দের তারিখ (প্রযোজ্য ক্ষেত্রে)", type: "date", required: false },
      { name: "note", label: "অতিরিক্ত মন্তব্য", type: "textarea", required: false },
    ],
    declarations: ["প্রদত্ত সব তথ্য সঠিক ও সত্য"],
  },
};

// Static catalogue is the fallback / seed source; once a database exists,
// services are loaded through MyGovBackend.listServices() (admin-editable).
const FALLBACK_SERVICES = SERVICES;

function sectorName(id) {
  return SERVICE_SECTORS.find((s) => s.id === id)?.name || "অন্যান্য";
}
function sectorIcon(id) {
  return SERVICE_SECTORS.find((s) => s.id === id)?.icon || "⚙️";
}
function statusLabel(status) {
  return {
    submitted: "জমা হয়েছে",
    processing: "প্রক্রিয়াধীন",
    approved: "অনুমোদিত",
    delivered: "বিতরণ হয়েছে",
    rejected: "বাতিল",
  }[status] || status;
}
