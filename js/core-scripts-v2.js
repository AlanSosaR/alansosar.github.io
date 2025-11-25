// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO (iOS + GitHub Pages)
// ============================================================

const { createClient } = supabase;

// ✔ URL real del proyecto
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ✔ NUEVA ANON KEY (Publishable Key)
const SUPABASE_ANON_KEY = "sb_publishable_nlFuhoF1VoPdY3kcePfSSg_Sw2hhtAF";

// ✔ sessionStorage (Safari/iOS & GitHub Pages compatible)
const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, val) => sessionStorage.setItem(key, val),
  removeItem: (key) => sessionStorage.removeItem(key)
};

// ✔ Crear cliente global
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado correctamente (publishable key + sessionStorage)");

// ============================================================
// Placeholders para evitar errores si auth-ui.js carga tarde
// ============================================================
window.__showLoggedIn = window.__showLoggedIn || function(){};
window.__showLoggedOut = window.__showLoggedOut || function(){};
