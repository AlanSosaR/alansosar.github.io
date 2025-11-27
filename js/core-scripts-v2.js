// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025
// Sin delays — Con restauración REAL de sesión
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";


// ============================================================
// STORAGE — sessionStorage obligatorio para GitHub Pages
// ============================================================

const storage = {
  getItem: (k) => sessionStorage.getItem(k),
  setItem: (k, v) => sessionStorage.setItem(k, v),
  removeItem: (k) => sessionStorage.removeItem(k),
};


// ============================================================
// CREAR CLIENTE GLOBAL
// ============================================================

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log("🔥 Supabase iniciado correctamente");


// ============================================================
// FUNCIÓN — Cargar perfil del usuario desde Supabase
// ============================================================

async function cargarPerfilGlobal(user) {
  const sb = window.supabaseClient;

  if (!user) {
    sessionStorage.removeItem("cortero_user");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const { data: perfil } = await sb
    .from("users")
    .select("id, name, photo_url")
    .eq("id", user.id)
    .single();

  const foto = perfil?.photo_url && perfil.photo_url !== "null"
    ? perfil.photo_url
    : "imagenes/avatar-default.svg";

  const u = {
    id: perfil.id,
    name: perfil.name || "Usuario",
    photo_url: foto
  };

  sessionStorage.setItem("cortero_user", JSON.stringify(u));

  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: u }));

  console.log("🟢 Usuario cargado global:", u);
}


// ============================================================
// ESPERAR SIEMPRE CAMBIOS DE SESIÓN DE SUPABASE
// ============================================================

window.supabaseClient.auth.onAuthStateChange(async (_, session) => {
  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// AL CARGAR LA PÁGINA — consultar sesión sin retrasos
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// SINCRONIZAR FOTO GLOBAL DESDE PERFIL
// ============================================================

document.addEventListener("userPhotoUpdated", (e) => {
  const newPhoto = e.detail.photo_url;

  let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
  usr.photo_url = newPhoto;
  sessionStorage.setItem("cortero_user", JSON.stringify(usr));

  const desk = document.getElementById("profile-photo-desktop");
  if (desk) desk.src = newPhoto;

  const mob = document.getElementById("profile-photo-mobile");
  if (mob) mob.src = newPhoto;

  console.log("🟣 Foto global actualizada:", newPhoto);
});


// ============================================================
// PLACEHOLDERS
// ============================================================

window.__showLoggedIn = window.__showLoggedIn || function () {};
window.__showLoggedOut = window.__showLoggedOut || function () {};
