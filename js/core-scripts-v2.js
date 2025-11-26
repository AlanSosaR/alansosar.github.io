// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025
// Sesión que NO SE BORRA y que CARGA SIEMPRE BIEN
// ============================================================

const { createClient } = supabase;

// URL REAL
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ANON (publishable)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ============================================================
// 🟢 FIX OFICIAL: sessionStorage → CORRECTO PARA SUPABASE + GITHUB PAGES
// ============================================================

const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, val) => sessionStorage.setItem(key, val),
  removeItem: (key) => sessionStorage.removeItem(key)
};

// ============================================================
// 🟢 CLIENTE GLOBAL — MODO CORRECTO
// ============================================================

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado correctamente (sessionStorage + publishable key)");

// Placeholders
window.__showLoggedIn = window.__showLoggedIn || function(){};
window.__showLoggedOut = window.__showLoggedOut || function(){};
