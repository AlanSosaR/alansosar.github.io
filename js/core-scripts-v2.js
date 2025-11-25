// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO (iOS + GitHub Pages)
// ============================================================

const { createClient } = supabase;

// ✔ Datos reales — URL correcta "mjmvw"
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ✔ Tu ANON key REAL (válida)
const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9zZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

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

console.log("🔥 Supabase conectado correctamente (URL mjmvw + sessionStorage)");


// ============================================================
// ✔ Placeholders para evitar errores si auth-ui.js carga tarde
// ============================================================
window.__showLoggedIn = window.__showLoggedIn || function(){};
window.__showLoggedOut = window.__showLoggedOut || function(){};
