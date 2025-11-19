// ============================================
//  SUPABASE CLIENT GLOBAL — Café Cortero
//  Compatible con GitHub Pages
// ============================================

// Carga el SDK global de Supabase desde CDN
// (ya está incluido en login.html)
// window.supabase es global

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Crear cliente global accesible desde cualquier archivo
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
