// ===========================================
// SUPABASE CLIENT — Café Cortero
// MODO GLOBAL
// ===========================================

// createClient VIENE del SDK cargado desde core-scripts.js
const { createClient } = supabase;

// URL y KEY
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Crear cliente global
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🔥 supabase-client.js cargado en modo GLOBAL");
