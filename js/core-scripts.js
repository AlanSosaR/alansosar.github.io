// ============================================================
// CORE SCRIPTS — Café Cortero (solo inicializa Supabase)
// ============================================================

// 1) SDK Supabase YA ESTÁ CARGADO desde el HTML
const { createClient } = supabase;

// 2) Crear cliente global (SIN usar localStorage para evitar QuotaExceededError)
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// 🚫 Evita localStorage (Safari lo bloquea → error)
// 🟢 Usa cookies + memoria (totalmente seguro para Café Cortero)
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: null,              // 🔥 Desactiva localStorage
    persistSession: true,       // Mantiene la sesión en memoria/cookies
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado — Cliente GLOBAL cargado (sin localStorage)");
console.log("⚡ core-scripts.js listo (versión segura para iOS/GitHub Pages)");
