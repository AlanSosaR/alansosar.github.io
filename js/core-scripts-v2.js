// ============================================================
// SUPABASE CLIENT — FIX FINAL (iOS + GitHub Pages)
// Sesión persistente REAL sin borrarse al refrescar
// ============================================================

const { createClient } = supabase;

// URL real del proyecto
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// Publishable Key segura
const SUPABASE_ANON_KEY = "sb_publishable_nlFuhoF1VoPdY3kcePfSSg_Sw2hhtAF";

// Storage seguro para iOS/GitHub Pages
const safeLocalStorage = {
  getItem: (key) => {
    try { return localStorage.getItem(key); }
    catch { return null; }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); }
    catch {}
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); }
    catch {}
  }
};

// Crear cliente global
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeLocalStorage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase CLIENT — SESIÓN PERSISTENTE OK");

// Placeholders
window.__showLoggedIn = window.__showLoggedIn || function(){};
window.__showLoggedOut = window.__showLoggedOut || function(){};
