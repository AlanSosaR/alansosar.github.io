// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025
// Funciona con trigger, login, registro y menú dinámico
// Sin errores rojos, sin PKCE, sin SDK duplicado
// ============================================================

console.log("🔥 SUPABASE CLIENT — Versión FINAL estable 2025");

// ------------------------------------------------------------
// 1) SDK de Supabase ya cargado desde index.html
// ------------------------------------------------------------
const { createClient } = supabase;

// ------------------------------------------------------------
// 2) Credenciales REALES del proyecto
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ------------------------------------------------------------
// 3) Persistencia segura en localStorage
// ------------------------------------------------------------
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// ------------------------------------------------------------
// 4) CREAR CLIENTE SUPABASE (REAL, DEFINITIVO)
// ------------------------------------------------------------
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

// ------------------------------------------------------------
// 5) Proxy simple: supabase.from(…)
// ------------------------------------------------------------
window.supabase = {
  from(table) {
    return window.supabaseClient.from(table);
  }
};

// ------------------------------------------------------------
// 6) CARGAR PERFIL GLOBAL DESDE TABLA "users"
// ------------------------------------------------------------
async function cargarPerfilGlobal(user) {
  if (!user) return;

  console.log("📥 Cargando perfil para ID:", user.id);

  const { data, error } = await window.supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Error cargando perfil de BD:", error);
    return;
  }

  // Guardar perfil en localStorage
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");

  console.log("👤 Perfil completo cargado:", data);

  // Avisar a todo el sistema (menú, avatar, saludos, etc.)
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: data }));
}

// ------------------------------------------------------------
// 7) LOGOUT REAL (Auth + limpieza local)
// ------------------------------------------------------------
async function logoutTotal() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}
window.corteroLogout = logoutTotal;

// ------------------------------------------------------------
// 8) EVENTOS DE AUTH (login, logout, confirmación de correo)
// ------------------------------------------------------------
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento de Auth:", event);

  if (session?.user) {
    // Usuario autenticado, cargar info desde BD
    cargarPerfilGlobal(session.user);
  } else {
    // No hay sesión
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});

// ------------------------------------------------------------
// 9) RESTAURAR SESIÓN AUTOMÁTICA AL CARGAR LA PÁGINa
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    console.log("🔁 Sesión restaurada automáticamente");
    cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚫 No hay sesión activa");
  }
});

// ------------------------------------------------------------
// 10) CONECTAR SESIÓN CON HEADER (PC)
// ------------------------------------------------------------

// Usuario logueado
document.addEventListener("userLoggedIn", () => {
  const header = document.querySelector(".header-fixed");
  if (header) {
    header.classList.add("logged");
    header.classList.remove("no-user");
  }
});

// Usuario invitado / logout
document.addEventListener("userLoggedOut", () => {
  const header = document.querySelector(".header-fixed");
  if (header) {
    header.classList.remove("logged");
    header.classList.add("no-user");
  }
});
