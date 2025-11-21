// ===========================================
// SUPABASE CLIENT — Café Cortero
// MODO GLOBAL (Fix temporal para GitHub Pages)
// ===========================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// 🔥 FIX IMPORTANTE PARA GITHUB PAGES
// Usamos sessionStorage porque localStorage está bloqueado allí.
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: sessionStorage,
  },
});

console.log("🔥 supabase-client.js cargado en modo GLOBAL (modo GitHub Pages)");
