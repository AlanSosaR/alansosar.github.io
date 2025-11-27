// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025
// Con restauración REAL de sesión + sincronización global
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ============================================================
// STORAGE — sessionStorage (fix para GitHub Pages)
// ============================================================

const storage = {
  getItem: (k) => sessionStorage.getItem(k),
  setItem: (k, v) => sessionStorage.setItem(k, v),
  removeItem: (k) => sessionStorage.removeItem(k),
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
  },
});

console.log("🔥 Supabase iniciado (sessionStorage + persistencia OK)");


// ============================================================
// FUNCIÓN GLOBAL — LLENA FOTO + NOMBRE EN TODA LA WEB
// ============================================================

async function cargarPerfilGlobal(user) {
  const sb = window.supabaseClient;

  if (!user) {
    sessionStorage.removeItem("cortero_user");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  // Leer datos reales desde tabla users
  const { data: perfil } = await sb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  let foto = perfil?.photo_url;
  if (!foto || foto === "null" || foto.trim() === "") {
    foto = "imagenes/avatar-default.svg";
  }

  const finalUser = {
    id: user.id,
    name: perfil?.name || "Usuario",
    photo_url: foto,
  };

  // Guardar para toda la web
  sessionStorage.setItem("cortero_user", JSON.stringify(finalUser));

  // Notificar a todos los menús
  document.dispatchEvent(
    new CustomEvent("userLoggedIn", { detail: finalUser })
  );

  console.log("🟢 Perfil global cargado:", finalUser);
}


// ============================================================
// FIX DEFINITIVO — ESPERAR RESTAURACIÓN DE SESIÓN
// ============================================================

window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    console.log("📌 Evento authStateChange:", event);
    await cargarPerfilGlobal(session.user);
  } else {
    console.log("📌 Usuario desconectado");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// AL CARGAR LA PÁGINA — revisar sesión y cargar perfil si existe
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Hay que esperar 200–300ms → Supabase tarda en restaurar sesión
  await new Promise((resolve) => setTimeout(resolve, 250));

  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// SINCRONIZAR FOTO GLOBAL — al cambiar desde perfil.js
// ============================================================

document.addEventListener("userPhotoUpdated", (e) => {
  const nuevaFoto = e.detail.photo_url;

  // Guardar en sessionStorage
  let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
  usr.photo_url = nuevaFoto;
  sessionStorage.setItem("cortero_user", JSON.stringify(usr));

  // Actualizar menú escritorio
  const desk = document.getElementById("profile-photo-desktop");
  if (desk) desk.src = nuevaFoto;

  // Actualizar menú móvil
  const mob = document.getElementById("profile-photo-mobile");
  if (mob) mob.src = nuevaFoto;

  console.log("🟣 Foto sincronizada globalmente:", nuevaFoto);
});


// ============================================================
// PLACEHOLDERS (evita errores si aún no existen en index / menú)
// ============================================================

window.__showLoggedIn = window.__showLoggedIn || function () {};
window.__showLoggedOut = window.__showLoggedOut || function () {};
