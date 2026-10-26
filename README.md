# myGov (মাইগভ) Demo — Netlify + Supabase

A **demo clone** of Bangladesh's government services portal [mygov.bd](https://mygov.bd),
built for learning and portfolio purposes. It recreates the citizen-facing
features — especially the multi-step **registration** flow — as a zero-build
static website that runs on **Netlify** with **Supabase** as the database/auth
backend.

> ⚠️ **Educational demo only.** This project is not affiliated with, endorsed by,
> or connected to the Government of Bangladesh or the real myGov platform.
> It does not process real government services, identity (NID/Porichoy), or
> payments. Every page carries a visible demo disclaimer.

---

## ✨ Features

| Area | What's included |
|---|---|
| **Registration (focus)** | myGov-style 4-step flow: identity (mobile **or** email tab) → 6-digit **OTP** → password with live policy checks → success screen. Country-code picker, English-name validation, BD mobile validation, resend timer, 6-box OTP input, duplicate checks |
| **Login** | Mobile/email tabs, show/hide password, remember-me, guarded redirects (`?next=`) |
| **Password recovery** | OTP-based reset for both email and mobile channels |
| **Homepage** | Hero search, service sectors (14), ministry/office & recipient browsers, linked services, popular services, FAQ accordion, help-desk (333) |
| **Service directory** | 16 demo services with search, sector/recipient filters, detail modal (fee, processing time, required docs) and one-click **apply** that issues a tracking number |
| **Dashboard** | Protected route, profile-completion ring, application stats, status table |
| **Application tracking** | Mobile + tracking-number lookup with a status timeline (seeded demo records included) |
| **Profile & document locker** | Personal info, NID, division/district, photo preview, mock NID verification, 7 document slots |
| **Accessibility** | myGov-style toolbar: font scaling, grayscale, invert, highlight links, big cursor, reset; keyboard shortcuts (`Alt+R` register, `Alt+L` login, `Alt+F` forgot, `Alt+S` services…) |
| **Bilingual UI** | Bengali-first with English helper labels, Bengali numerals where appropriate |
| **Two interchangeable backends** | **Demo mode** (browser localStorage, no setup) and **Supabase mode** (real Postgres + Auth), selected automatically |

---

## 🧱 Tech stack

- **Plain HTML/CSS/JavaScript** — no framework, no build step
- [Supabase JS v2](https://supabase.com/docs/reference/javascript) via CDN (Auth + Postgres/RLS)
- **Netlify Functions** (zero npm dependencies, Node 18+) for hashed mobile OTP storage and admin password reset
- Hind Siliguri / Noto Sans Bengali (Google Fonts)

```
Mygov.bd/
├── index.html               # Homepage
├── registration.html        # ⭐ Multi-step registration
├── login.html
├── forgot-password.html
├── dashboard.html           # Protected
├── services.html            # Service directory + apply
├── track.html               # Application tracking
├── profile.html             # Protected
├── 404.html
├── assets/
│   ├── css/styles.css       # Full design system
│   └── js/
│       ├── config.js        # 👉 Put your Supabase keys here
│       ├── supabase-client.js
│       ├── backend.js       # DemoBackend vs SupabaseBackend (one API)
│       ├── common.js        # Header/footer, a11y toolbar, validation
│       ├── services-data.js # Demo service catalogue
│       └── …page scripts
├── netlify/functions/       # send-otp · verify-otp · reset-mobile-password
├── supabase/schema.sql      # Tables, RLS, triggers, RPCs, seed data
├── netlify.toml
└── .env.example
```

---

## 🚀 Run locally (zero setup — demo mode)

The site works immediately without any account. OTP `123456` is shown on screen.

```bash
# any static server, e.g.
python3 -m http.server 8080
# open http://localhost:8080
```

Try it: **Registration → mobile tab → any valid name + `01712345678` →
captcha → OTP `123456` → password `Secret@123`**. Then log in, apply for a
service, and track it.

---

## 🗄️ Connect Supabase (real database)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste and run everything from
   [`supabase/schema.sql`](supabase/schema.sql). It creates `profiles`,
   `otp_requests`, `applications`, `demo_tracking`, RLS policies, the
   `handle_new_user()` trigger, RPCs (`identifier_taken`, `track_application`)
   and seeded tracking records.
3. **Project Settings → API**, copy the **Project URL** and **anon public** key
   into [`assets/js/config.js`](assets/js/config.js):
   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGci…",
   ```
4. **Authentication → Sign In / Up**:
   - Turn **OFF "Confirm email"** — mobile-only accounts use a synthetic email
     (`8801…@phone.mygov-demo.app`) and cannot click confirmation links.
   - To use **6-digit email OTP**, edit the *Magic Link* email template and
     replace `{{ .ConfirmationURL }}` with the raw token **`{{ .Token }}`**.
5. Add your site URL under **Authentication → URL Configuration**.

Mobile-only registrations are stored in Supabase Auth with a deterministic
synthetic email derived from the phone number, while the real number lives in
`profiles.mobile_digits`. Login reconstructs the same address behind the scenes.

---

## ☁️ Deploy to Netlify

### Option A — Git-connected (recommended, enables Functions)

1. Push this repo to GitHub and import it in Netlify.
2. No build command needed; publish directory is the repo root (already set in
   `netlify.toml`).
3. **Site settings → Environment variables** (see `.env.example`):

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | your project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service-role key (**server-only**, never ship it in frontend code) |
   | `DEMO_MODE` | `true` to keep showing on-screen OTP, `false` after wiring an SMS gateway |
   | `DEMO_OTP` | `123456` (optional) |
   | `SMS_API_URL` / `SMS_API_KEY` | optional generic SMS webhook (`POST {to, message, otp}`) |

### Option B — Drag & drop

Drag the project folder into the Netlify drop zone. The static site (including
full demo-mode registration) works instantly; serverless functions deploy via
Option A or Netlify CLI (`netlify deploy --build`).

### OTP behavior matrix

| Setup | Mobile OTP | Email OTP |
|---|---|---|
| No keys / demo mode | Fixed code `123456` shown on screen, stored in localStorage | Same demo code |
| Supabase + Netlify, `DEMO_MODE=true` | Function returns `123456`, no SMS cost | Real 6-digit email via Supabase |
| Supabase + Netlify, `DEMO_MODE=false` | Random code, hashed in `otp_requests` (5-min expiry, rate-limited), sent via your SMS webhook | Real 6-digit email via Supabase |

If the functions can't be reached, the frontend silently falls back to the
on-screen demo OTP so the registration flow never breaks.

---

## 🧪 Demo reference data

| Purpose | Value |
|---|---|
| Demo OTP (all channels) | `123456` |
| Sample tracking number | `BD-DEMO-1001` (processing) or `BD-DEMO-1002` (delivered) |
| Sample mobile for tracking | `01700000000` |
| Password policy | 8+ chars with upper, lower, number & special character |
| Valid BD mobile | `01[3-9]` + 8 digits, e.g. `01712345678` |

---

## 🔒 Security notes

- RLS is enabled on every table; users can only read/write their own rows.
  `otp_requests` has **no client policies** — only the service-role functions
  touch it. OTPs are stored SHA-256 hashed with expiry and attempt limits.
- The Supabase **service-role key only ever lives in Netlify env vars**.
- Demo mode stores passwords in localStorage purely for convenience — it is a
  browser-only simulation. Supabase mode uses GoTrue's real password hashing.
- Replace the demo captcha checkbox with Google reCAPTCHA / Turnstile before
  any non-demo use, and connect a real SMS gateway and the Porichoy/NID
  verification provider.

## ⚖️ Disclaimer

This is an independent educational project inspired by the public UX of
mygov.bd. All government names, marks and service names belong to their
respective owners. Do not present this as an official portal or collect real
citizen data without proper authorisation and security review.
