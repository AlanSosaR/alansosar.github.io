// ============================================================
// CORE SCRIPTS — Café Cortero (VERSIÓN FINAL SIN DUPLICADOS)
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

// ============================================================
// FUNCIÓN PARA CARGAR SCRIPTS UNA SOLA VEZ
// ============================================================
function cargarUnico(src) {
  if ([...document.scripts].some(s => s.src.includes(src))) {
    console.warn("⚠️ Script ya cargado, evitando duplicado:", src);
    return;
  }
  const s = document.createElement("script");
  s.src = src;
  s.defer = true;
  document.body.appendChild(s);
}

// ============================================================
// CARGA BASE — SIEMPRE
// ============================================================
cargarUnico("js/supabase-auth.js");
cargarUnico("js/auth-ui.js");
cargarUnico("js/main.js");

// ============================================================
// PÁGINAS ESPECÍFICAS
// ============================================================

// Registro
if (document.querySelector("#registroForm")) {
  cargarUnico("js/registro-cliente.js");
}

// Login
if (document.querySelector("#loginForm")) {
  cargarUnico("js/login-scripts.js");
}

console.log("⚡ Core Scripts cargados completamente");
