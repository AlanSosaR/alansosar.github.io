// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025
// Sesión persistente compatible con GitHub Pages
// ============================================================

const { createClient } = supabase;

// URL REAL DEL PROYECTO SUPABASE
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ANON KEY
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ============================================================
// ALMACENAMIENTO — sessionStorage (FIX para GitHub Pages)
// ============================================================

const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, val) => sessionStorage.setItem(key, val),
  removeItem: (key) => sessionStorage.removeItem(key)
};

// ============================================================
// CLIENTE GLOBAL SUPABASE
// ============================================================

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado correctamente (sessionStorage + persistencia activada)");


// ============================================================
// 🔥 FUNCIÓN GLOBAL: CARGAR DATOS DEL USUARIO EN TODA LA WEB
// Ejecuta cada vez que se carga una página
// ============================================================

window.cargarUsuarioGlobal = async function () {
  const sb = window.supabaseClient;

  const { data, error } = await sb.auth.getUser();

  if (error || !data.user) {
    // Nadie logueado → Menús mostrar modo invitado
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const user = data.user;

  // Leer datos reales desde tabla "users"
  const { data: perfil } = await sb
    .from("users")
    .select("name, photo_url")
    .eq("id", user.id)
    .single();

  // Si hay datos → enviarlos a toda la web
  document.dispatchEvent(new CustomEvent("userLoggedIn", {
    detail: {
      id: user.id,
      name: perfil?.name || "Usuario",
      photo_url: perfil?.photo_url || "imagenes/avatar-default.svg"
    }
  }));
};


// ============================================================
// 🔥 EVENTO global que escucha cambios de FOTO en perfil.js
// Al dispararse, actualiza los menús instantáneamente
// ============================================================

document.addEventListener("userPhotoUpdated", (e) => {
  const url = e.detail.photo_url;

  // Escritorio
  const desktop = document.getElementById("profile-photo-desktop");
  if (desktop) desktop.src = url;

  // Móvil
  const mobile = document.getElementById("profile-photo-mobile");
  if (mobile) mobile.src = url;

  console.log("🟢 Foto sincronizada globalmente:", url);
});


// ============================================================
// 🔥 Cargar usuario automáticamente al abrir cualquier página
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  window.cargarUsuarioGlobal();
});


// ============================================================
// PLACEHOLDERS (para evitar errores si aún no están definidos)
// ============================================================

window.__showLoggedIn = window.__showLoggedIn || function () {};
window.__showLoggedOut = window.__showLoggedOut || function () {};
