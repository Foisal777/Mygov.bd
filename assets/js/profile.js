/* ============================================================
 * profile.js — citizen profile, NID verification demo,
 * document locker
 * ============================================================ */

const el = (id) => document.getElementById(id);
const DOC_TYPES = [
  { id: "photo", label: "প্রোফাইল ছবি", icon: "📷" },
  { id: "nid", label: "জাতীয় পরিচয়পত্র (NID)", icon: "🪪" },
  { id: "passport", label: "পাসপোর্ট", icon: "🛂" },
  { id: "brn", label: "জন্ম নিবন্ধন সনদ", icon: "📜" },
  { id: "tin", label: "টিন সার্টিফিকেট", icon: "🧾" },
  { id: "signature", label: "স্বাক্ষর", icon: "✍️" },
  { id: "ssc", label: "এসএসসি সনদ", icon: "🎓" },
];

let user = null;
let documents = [];

function val(id) { return el(id).value.trim(); }

document.addEventListener("DOMContentLoaded", async () => {
  user = await requireAuth();
  if (!user) return;

  const p = user.profile || {};
  el("full_name").value = user.full_name || user.name || "";
  el("mobile").value = user.mobile || "";
  el("email").value = user.email || "";
  el("nid").value = user.nid || p.nid || "";
  el("birth_date").value = user.birth_date || p.birth_date || "";
  el("gender").value = user.gender || p.gender || "";
  el("division").value = user.division || p.division || "";
  el("district").value = user.district || p.district || "";
  el("address").value = user.address || p.address || "";
  if (user.is_verified || p.verified) showVerified();
  if (p.photo) {
    el("avatar-preview").innerHTML = `<img src="${p.photo}" alt="profile photo" />`;
  } else {
    el("avatar-preview").textContent = initials(user.full_name || user.name || "");
  }
  documents = p.documents || user.documents || [];
  renderDocs();

  /* photo upload → downscaled data URL (demo-friendly) */
  el("photo-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast("ছবি ২MB এর মধ্যে রাখুন", "error");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 160;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        el("avatar-preview").innerHTML = `<img src="${dataUrl}" alt="profile photo" />`;
        el("avatar-preview").dataset.photo = dataUrl;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  /* save */
  el("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nid = val("nid");
    if (nid && !/^\d{10}$|^\d{13}$|^\d{17}$/.test(nid)) {
      toast("NID নম্বর ১০, ১৩ বা ১৭ সংখ্যার হতে হবে", "error");
      return;
    }
    const btn = el("btn-save");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> সংরক্ষণ হচ্ছে…`;
    try {
      const patch = {
        full_name: val("full_name"),
        email: val("email"),
        nid,
        birth_date: val("birth_date"),
        gender: val("gender"),
        division: val("division"),
        district: val("district"),
        address: val("address"),
        profile: {
          nid,
          birth_date: val("birth_date"),
          gender: val("gender"),
          division: val("division"),
          district: val("district"),
          address: val("address"),
          photo: el("avatar-preview").dataset.photo || user.profile?.photo || "",
          documents,
        },
      };
      await MyGovBackend.updateProfile(patch);
      toast("প্রোফাইল হালনাগাদ হয়েছে", "success");
    } catch (err) {
      toast(err.message || "সংরক্ষণ ব্যর্থ", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "💾 তথ্য হালনাগাদ করুন";
    }
  });

  /* mock NID verification (Porichoy-style) */
  el("btn-verify").addEventListener("click", async () => {
    const nid = val("nid");
    if (!/^\d{10}$|^\d{13}$|^\d{17}$/.test(nid)) {
      toast("যাচাইয়ের আগে সঠিক NID নম্বর লিখুন", "error");
      return;
    }
    const btn = el("btn-verify");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> যাচাই হচ্ছে…`;
    setTimeout(async () => {
      showVerified();
      try {
        await MyGovBackend.updateProfile({ is_verified: true, profile: { verified: true } });
      } catch (_) { /* demo */ }
      toast("NID যাচাই সফল হয়েছে (ডেমo)", "success");
    }, 1400);
  });
});

function showVerified() {
  el("verify-badge").hidden = false;
  const btn = el("btn-verify");
  if (btn) btn.hidden = true;
}

function renderDocs() {
  el("doc-list").innerHTML = DOC_TYPES.map((d) => {
    const saved = documents.find((x) => x.type === d.id);
    return `
      <div class="doc-item">
        <span class="doc-icon">${d.icon}</span>
        <span class="doc-meta">
          <b>${d.label}</b>
          <small>${saved ? escapeHtml(saved.name) : "কোনো ফাইল আপলোড হয়নি"}</small>
        </span>
        <label class="btn btn-ghost btn-sm" for="doc-${d.id}" style="cursor:pointer">
          ${saved ? "পরিবর্তন" : "আপলোড"}
        </label>
        <input type="file" id="doc-${d.id}" hidden data-doc="${d.id}" />
      </div>`;
  }).join("");

  DOC_TYPES.forEach((d) => {
    el(`doc-${d.id}`).addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      documents = documents.filter((x) => x.type !== d.id);
      documents.push({ type: d.id, name: file.name, size: file.size, at: new Date().toISOString() });
      toast(`${d.label} আপলোড হয়েছে (ডেমো) — ‘হালনাগাদ’ চাপুন`, "success");
      renderDocs();
    });
  });
}
