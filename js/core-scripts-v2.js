// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY = "TU_KEY";

// Usar sessionStorage en vez de localStorage
const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key),
};

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado con FIX sessionStorage (GitHub Pages OK)");
