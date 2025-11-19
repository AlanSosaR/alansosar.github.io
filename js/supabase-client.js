// ============================================
//  SUPABASE CLIENT GLOBAL — Café Cortero
//  Compatible con GitHub Pages (sin ESModules)
// ============================================

// ⚠️ Este archivo DEBE cargarse DESPUÉS del SDK Supabase
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Crear el cliente Supabase global (window.supabase viene del CDN)
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Confirmación en consola
console.log("✔ Supabase conectado correctamente");
