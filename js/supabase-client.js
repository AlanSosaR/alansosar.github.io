// ============================================
//  SUPABASE CLIENT GLOBAL — Café Cortero
//  Compatible con GitHub Pages
// ============================================

// A esta altura ya existe window.supabase porque lo cargaste
// con <script src="https://cdn.jsdelivr.net/..."></script>

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Crear cliente Supabase GLOBAL
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Confirmación en consola (opcional)
console.log("Supabase inicializado correctamente ✔");
