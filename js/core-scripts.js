// ============================================================
// CORE SCRIPTS — Café Cortero
// Archivo central que controla TODO el sitio
// Se importa UNA SOLA VEZ en cada página
// ============================================================

// 1) SDK Supabase YA ESTÁ CARGADO desde el HTML
//    Usamos la variable global "supabase"
const { createClient } = supabase;

// 2) Crear cliente global
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🔥 Supabase conectado — Cliente GLOBAL cargado");

// 3) Cargar módulos internos dinámicamente
const cargarScript = (src) => {
  const s = document.createElement("script");
  s.src = src;
  s.defer = true;
  document.body.appendChild(s);
};

// Cargar módulos base
cargarScript("js/supabase-auth.js");
cargarScript("js/auth-ui.js");
cargarScript("js/main.js");

// Registro (si existe)
if (document.querySelector("#registroForm")) {
  cargarScript("js/registro-cliente.js");
}

// Login (si existe)
if (document.querySelector("#loginForm")) {
  cargarScript("js/login-scripts.js");
}

console.log("⚡ Core Scripts cargados completamente");
