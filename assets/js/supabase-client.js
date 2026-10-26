/* ============================================================
 * supabase-client.js — initialises Supabase (or flags demo mode)
 * Requires: config.js + @supabase/supabase-js v2 (CDN, see pages)
 * ============================================================ */
(function () {
  const cfg = window.MYGOV_CONFIG || {};
  const looksFake =
    !cfg.SUPABASE_URL ||
    cfg.SUPABASE_URL.includes("YOUR-PROJECT") ||
    !cfg.SUPABASE_ANON_KEY ||
    cfg.SUPABASE_ANON_KEY.includes("YOUR-SUPABASE");

  window.MYGOV_DEMO_MODE = cfg.FORCE_DEMO_MODE === true || looksFake;

  if (window.MYGOV_DEMO_MODE) {
    window.supabase = null;
    console.info("[myGov demo] DEMO MODE — using browser localStorage. Add Supabase keys in assets/js/config.js to connect a real database.");
    return;
  }

  if (!window.supabaseJs || !window.supabaseJs.createClient) {
    console.warn("[myGov demo] Supabase CDN failed to load — falling back to demo mode.");
    window.MYGOV_DEMO_MODE = true;
    window.supabase = null;
    return;
  }

  window.supabase = window.supabaseJs.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
})();
