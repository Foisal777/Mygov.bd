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
| **Profile & document locker** | Personal info, NID, division/district, photo preview, mock NID verification, 7 document slots; admin verification/block changes reflect here instantly |
| **Dynamic service forms** | Every service opens a real application form (`apply.html`) driven by JSON schemas — includes the full **নতুন সমবায় সমিতি রেজিস্ট্রেশন** (Samity registration) form with 11 fields, declarations and NID check; submissions get a tracking number and appear in the admin queue |
| **🛡️ Admin panel** | Separate console at `/admin/` — dashboard stats, citizen management (verify / block / view), application workflow (5 statuses, office notes, timeline), full service catalogue CRUD (add/edit/disable/delete) |
| **Accessibility** | myGov-style toolbar: font scaling, grayscale, invert, highlight links, big cursor, reset; keyboard shortcuts (`Alt+R` register, `Alt+L` login, `Alt+F` forgot, `Alt+S` services…) |
| **Bilingual UI** | Bengali-first with English helper labels, Bengali numerals where appropriate (forms accept Bengali numerals too) |
| **Two interchangeable backends** | **Demo mode** (browser localStorage, no setup) and **Supabase mode** (real Postgres + Auth), selected automatically — admin panel works in both |

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
├── apply.html               # Dynamic service application forms (Samity etc.)
├── 404.html
├── admin/                   # 🛡️ Admin panel
│   ├── login.html
│   ├── index.html           # Stats dashboard
│   ├── users.html           # Citizen management
│   ├── applications.html    # Application workflow
│   └── services.html        # Service catalogue CRUD
├── assets/
│   ├── css/styles.css       # Citizen design system
│   ├── css/admin.css        # Admin console styles
│   └── js/
│       ├── config.js        # 👉 Put your Supabase keys here
│       ├── supabase-client.js
│       ├── backend.js       # DemoBackend vs SupabaseBackend (one API, incl. admin)
│       ├── common.js        # Header/footer, a11y toolbar, validation
│       ├── services-data.js # Service catalogue + form schemas (FORM_SCHEMAS)
│       ├── apply.js         # Dynamic form engine
│       └── admin/           # Admin page scripts
├── netlify/functions/       # send-otp · verify-otp · reset-mobile-password · admin-api
├── supabase/
│   ├── schema.sql                    # Full schema for fresh installs
│   └── admin-and-services.sql        # Migration if you ran the earlier schema
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

## 🛡️ Admin panel (training console)

Open **`/admin/login.html`** (also linked from the citizen login page and footer).

### Demo-mode credentials (work immediately, no setup)

| Field | Value |
|---|---|
| Admin ID / email | `admin@mygov-demo.app` (or just `admin`) |
| Password | `Admin@123` |

A **"⚡ ডেমো ক্রেডেনশিয়াল বসান"** button fills these in one click. On first load
the demo database is seeded with two sample citizens and three applications so
the console never looks empty during training.

### What the admin can control

1. **ড্যাশবোর্ড** — totals for citizens, applications (processing/delivered),
   active services; recent applications feed.
2. **নাগরিক ইউজার** — search citizens, view full profile, mark NID **verified /
   unverified**, **block/unblock** accounts (blocked citizens cannot log in).
3. **আবেদন সমূহ** — filter by status/search, inspect submitted form data
   (including the full Samity registration form), change status across
   `submitted → processing → approved → delivered / rejected`, and add an
   office note. Changes are immediately visible on the citizen's tracking page
   (timeline rebuilt automatically).
4. **সেবা ব্যবস্থাপনা** — add a brand-new service, edit any service (fee,
   office, sector, required documents, choose *Samity form* or *generic form*),
   hide it from citizens (inactive) or delete it. The citizen service directory
   renders from this editable catalogue, not a hard-coded list.

### Admin on Supabase

- Run **`supabase/admin-and-services.sql`** once (fresh installs of
  `schema.sql` already include it). It adds the `services` table, `blocked`,
  `form_data` and `admin_note` columns, plus the 18-service seed.
- The browser talks to one Netlify Function, **`admin-api`**, authenticated by
  an HMAC token issued at login. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (and
  optionally `ADMIN_SECRET`) in Netlify environment variables — see
  `.env.example`. With `DEMO_MODE=true` and no password set, the documented
  demo credentials still work. All data operations use the service-role key
  server-side; it is never exposed to the browser.

### Example training flow: new সমবায় সমিতি registration

1. Citizen registers/logs in → **Services → নতুন সমবায় সমিতি রেজিস্ট্রেশন →
   আবেদন করুন** (or open `apply.html?id=srv-17`).
2. Fill the 11-field Samity form (name, type, district/upazila, member count —
   Bengali numerals accepted — committee, objectives), tick declarations,
   submit. A tracking number is issued.
3. Admin → **আবেদন সমূহ** → open the application → move it through
   processing → approved → delivered with a note.
4. Citizen → **আবেদন ট্র্যাকিং** sees the updated timeline and office note.

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
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | admin panel login (falls back to demo creds when `DEMO_MODE=true`) |
   | `ADMIN_SECRET` | HMAC secret for admin tokens (optional; defaults to the service key) |
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
| Demo admin login | `/admin/login.html` — `admin@mygov-demo.app` / `Admin@123` |
| Seeded citizens | `01812345678` (Karim, verified) · `01912345678` (Rahima), password `Secret@123` |
| Sample tracking number | `BD-DEMO-1001` (processing) or `BD-DEMO-1002` (delivered) |
| Seeded admin applications | `BD-DEMO-2001/2002/2003` (visible in the admin panel) |
| Sample mobile for tracking | `01700000000` |
| Samity service deep link | `apply.html?id=srv-17` |
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
