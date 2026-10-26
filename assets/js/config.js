/* ============================================================
 * myGov (মাইগভ) Demo — Site Configuration
 * ------------------------------------------------------------
 * 1) Create a free Supabase project (https://supabase.com)
 * 2) Run supabase/schema.sql inside Supabase SQL Editor
 * 3) Copy Project URL + anon public key below
 * 4) Deploy this folder to Netlify
 *
 * While the values below are placeholders the site automatically
 * runs in DEMO MODE (data in browser localStorage, OTP shown on
 * screen). No server is required to try the registration flow.
 * ============================================================ */
window.MYGOV_CONFIG = {
  // Supabase -> Project Settings -> API
  SUPABASE_URL: "https://YOUR-PROJECT-ref.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-SUPABASE-ANON-PUBLIC-KEY",

  // Force demo mode even when Supabase keys are present (true/false)
  FORCE_DEMO_MODE: false,

  // OTP used by demo mode (shown on screen instead of a real SMS)
  DEMO_OTP: "123456",

  // Demo admin panel credentials (demo mode only — shown on the admin login page)
  DEMO_ADMIN: { USERNAME: "admin@mygov-demo.app", PASSWORD: "Admin@123" },

  // Mobile-only accounts are stored in Supabase Auth with a synthetic
  // email built from the phone number, e.g. 8801712345678@phone.mygov-demo.app
  SYNTHETIC_EMAIL_DOMAIN: "phone.mygov-demo.app",

  // Netlify Functions endpoints (deployed automatically from /netlify/functions).
  // If unreachable (e.g. opening the static site without functions),
  // the app silently falls back to on-screen demo OTP.
  FUNCTIONS: {
    SEND_OTP: "/.netlify/functions/send-otp",
    VERIFY_OTP: "/.netlify/functions/verify-otp",
    RESET_MOBILE_PASSWORD: "/.netlify/functions/reset-mobile-password",
    ADMIN_API: "/.netlify/functions/admin-api",
  },
};
