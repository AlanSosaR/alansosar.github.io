// ============================================================
// CORE SCRIPTS — Café Cortero
// ÚNICO SCRIPT que se carga en TODAS las páginas
// ============================================================

// ---------- 1) SDK Supabase ES Module ----------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------- 2) Crear cliente global ----------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🔥 Supabase conectado — Cliente GLOBAL cargado");


// ---------- 3) Cargar módulos internos sin imports ni conflictos ----------

// Auth global (signUp, login, logout, getUser)
import "./supabase-auth.js";

// UI del header + drawer
import "./auth-ui.js";

// Lógica principal del sitio (drawer, carrito, FAB, producto, etc)
import "./main.js";

// Registro (solo si existe la página)
try { await import("./registro-cliente.js"); } catch(e) {}

// Login (solo si existe la página)
try { await import("./login-scripts.js"); } catch(e) {}

console.log("⚡ Core Scripts cargados completamente");
