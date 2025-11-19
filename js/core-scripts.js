
// ==========================================
// CORE SCRIPTS — Café Cortero
// Archivo central que controla TODO el sitio
// Se importa UNA SOLA VEZ en cada página
// ==========================================

// 1) SDK de Supabase (ES modules)
import "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 2) Cliente Supabase global (window.supabaseClient)
import "./supabase-client.js";

// 3) Módulo de autenticación (login, logout, session, signUp)
import "./supabase-auth.js";

// 4) UI del header y drawer (foto, nombre, estado login)
import "./auth-ui.js";

// 5) Lógica principal del sitio (drawer, carrusel, carrito, FAB, producto)
import "./main.js";

// 6) Lógica de registro (solo si existe la página de registro)
try { await import("./registro-cliente.js"); } catch (err) {}

// 7) Lógica de login (solo si existe la página de login)
try { await import("./login-scripts.js"); } catch (err) {}

console.log("🔥 Core Scripts cargados correctamente");
