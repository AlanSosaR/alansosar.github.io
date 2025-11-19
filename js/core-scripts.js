// =============================================
// CORE SCRIPTS — Café Cortero (VERSIÓN OFICIAL)
// Cargar este archivo UNA SOLA VEZ por página
// =============================================

// 1) SDK Supabase ES Module (createClient)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// -------------------------------
// 2) Configurar cliente global
// -------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Cliente Supabase global disponible en TODAS las páginas
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🔥 Supabase conectado desde CORE");

// -------------------------------------------
// 3) Módulos del proyecto (cargan en orden)
// -------------------------------------------

// Autenticación (signUp, login, logout, getUser)
import "./supabase-auth.js";

// UI del header + drawer
import "./auth-ui.js";

// Lógica del sitio (carrito, hero, drawer, producto)
import "./main.js";

// Registro (si existe la página)
try { await import("./registro-cliente.js"); } catch (err) {}

// Login (si existe la página)
try { await import("./login-scripts.js"); } catch (err) {}

console.log("⚡ Core Scripts cargados correctamente");
