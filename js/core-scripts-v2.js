// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO PARA GITHUB PAGES
// ============================================================

// SDK ya está cargado desde el HTML
const { createClient } = supabase;

// ============================================================
// 🚀 TUS DATOS REALES DE SUPABASE — CORRECTOS
// ============================================================

// ❗❗ ESTA ES LA URL CORRECTA (SIN LA "v" EXTRA)
// https://eaipcuvvddyrqkbmjmw.supabase.co
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmw.supabase.co";

// Clave ANON correcta
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";


// ============================================================
// 🟢 FIX: sessionStorage para GitHub Pages, Safari y Móviles
// ============================================================

const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};


// ============================================================
// 🟢 CREAR CLIENTE GLOBAL — YA LISTO PARA LOGIN / REGISTRO
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

console.log("🔥 Supabase conectado correctamente (URL válida + sessionStorage)");
