// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO (iOS + GitHub Pages)
// ============================================================

// SDK ya está cargado desde el HTML
const { createClient } = supabase;

// ============================================================
// DATOS REALES DEL PROYECTO
// ============================================================

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9zZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ============================================================
// STORAGE SEGURO PARA iOS / SAFARI
// ============================================================

const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key),
};

// ============================================================
// CREAR CLIENTE GLOBAL
// ============================================================

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

console.log("🔥 Supabase conectado correctamente (sessionStorage + iOS FIX)");


// ============================================================
// PLACEHOLDERS SEGUROS PARA EVITAR ERRORES DE CARGA
// ============================================================

window.__showLoggedIn = window.__showLoggedIn || function () {};
window.__showLoggedOut = window.__showLoggedOut || function () {};
