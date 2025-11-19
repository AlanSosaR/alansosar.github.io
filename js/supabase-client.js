// ===========================================
// SUPABASE CLIENT — Café Cortero
// Archivo PARA NAVEGADOR (no módulos)
// ===========================================

// Cargar createClient desde el SDK global
const { createClient } = supabase;

// Tu URL y ANON KEY
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Crear cliente real
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Guardarlo como global para que main.js lo use
window.supabaseClient = client;

console.log("Supabase conectado correctamente");
