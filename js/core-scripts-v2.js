// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO PARA GITHUB PAGES
// ============================================================

// SDK ya está cargado desde el HTML
const { createClient } = supabase;

// ============================================================
// 🚀 DATOS REALES Y CORRECTOS DE SUPABASE
// ============================================================

// URL correcta (la tuya REAL)
// NOTA: tiene “jmvw”, NO “jm**mw**”
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// Clave ANON correcta (la tuya real)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";


// ============================================================
// 🟢 FIX: sessionStorage (Safari / iOS / GitHub Pages)
// ============================================================

const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};


// ============================================================
// 🟢 CREAR CLIENTE GLOBAL (SE USA EN TODO EL PROYECTO)
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

console.log("🔥 Supabase conectado correctamente (URL correcta jmvw + sessionStorage)");
