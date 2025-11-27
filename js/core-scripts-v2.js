// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025
// CON FIX REAL: ESPERAR A QUE LA SESIÓN SE RESTAURE
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key),
};

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log("🔥 Supabase inicializado con FIX de sesión persistente");


// ============================================================
// ⚡ FUNCIÓN GLOBAL (carga datos reales del usuario)
// ============================================================

async function cargarPerfilGlobal(user) {
  if (!user) {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const sb = window.supabaseClient;

  const { data: perfil } = await sb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  let fotoFinal = perfil?.photo_url;
  if (!fotoFinal || fotoFinal === "null" || fotoFinal.trim() === "") {
    fotoFinal = "imagenes/avatar-default.svg";
  }

  const userData = {
    id: user.id,
    name: perfil?.name || "Usuario",
    photo_url: fotoFinal,
  };

  sessionStorage.setItem("cortero_user", JSON.stringify(userData));

  document.dispatchEvent(
    new CustomEvent("userLoggedIn", {
      detail: userData,
    })
  );

  console.log("🟢 Perfil cargado global:", userData);
}


// ============================================================
// 🟢 FIX REAL: USAR onAuthStateChange PARA ESPERAR SESIÓN
// ============================================================

window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// 🟢 Al cargar la página, si ya hay sesión → cargar perfil
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  }
});


// ============================================================
// SINCRONIZAR FOTO GLOBALMENTE
// ============================================================

document.addEventListener("userPhotoUpdated", (e) => {
  const url = e.detail.photo_url;

  let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
  usr.photo_url = url;
  sessionStorage.setItem("cortero_user", JSON.stringify(usr));

  const desktop = document.getElementById("profile-photo-desktop");
  if (desktop) desktop.src = url;

  const mobile = document.getElementById("profile-photo-mobile");
  if (mobile) mobile.src = url;

  console.log("🟢 Foto actualizada globalmente:", url);
});


// PLACEHOLDERS
window.__showLoggedIn = window.__showLoggedIn || function () {};
window.__showLoggedOut = window.__showLoggedOut || function () {};
