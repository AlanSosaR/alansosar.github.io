// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO PARA GITHUB PAGES
// ============================================================

// SDK ya está cargado desde el HTML
const { createClient } = supabase;

// 🚀 Tus credenciales reales (YA CORRECTAS)
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// 🟢 FIX: usar sessionStorage en vez de localStorage (Safari / GitHub Pages OK)
const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};

// 🟢 Crear cliente global
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado con FIX sessionStorage (GitHub Pages OK)");


// ============================================================
// 🔥 FIX DEFINITIVO DEL MENÚ – AUTO CAMBIO LOGIN/LOGOUT
// ============================================================

function activarMenuUsuario(user) {
  // ESCRITORIO
  const loginDesktop = document.getElementById("login-desktop");
  const profileDesktop = document.getElementById("profile-desktop");
  const helloDesktop = document.getElementById("hello-desktop");
  const avatarDesktop = document.getElementById("profile-photo-desktop");

  if (loginDesktop) loginDesktop.style.display = "none";
  if (profileDesktop) profileDesktop.style.display = "flex";

  if (helloDesktop)
    helloDesktop.textContent = "Hola, " + (user.user_metadata.full_name || "Usuario");

  if (avatarDesktop)
    avatarDesktop.src = user.user_metadata.photo_url || "imagenes/avatar-default.svg";

  // MÓVIL
  const drawerDefault = document.getElementById("drawer-links-default");
  const drawerLogged = document.getElementById("drawer-links-logged");
  const helloMobile = document.getElementById("hello-mobile");
  const avatarMobile = document.getElementById("profile-photo-mobile");

  if (drawerDefault) drawerDefault.style.display = "none";
  if (drawerLogged) drawerLogged.style.display = "block";

  if (helloMobile)
    helloMobile.textContent = "Hola, " + (user.user_metadata.full_name || "Usuario");

  if (avatarMobile)
    avatarMobile.src = user.user_metadata.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Menú → usuario logueado");
}

function activarMenuInvitado() {
  // ESCRITORIO
  const loginDesktop = document.getElementById("login-desktop");
  const profileDesktop = document.getElementById("profile-desktop");

  if (loginDesktop) loginDesktop.style.display = "inline-block";
  if (profileDesktop) profileDesktop.style.display = "none";

  // MÓVIL
  const drawerDefault = document.getElementById("drawer-links-default");
  const drawerLogged = document.getElementById("drawer-links-logged");

  if (drawerDefault) drawerDefault.style.display = "block";
  if (drawerLogged) drawerLogged.style.display = "none";

  console.log("🔴 Menú → invitado");
}


// ============================================================
// 🧠 LISTENER GLOBAL — DETECTA LOGIN / LOGOUT AUTOMÁTICAMENTE
// ============================================================

window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento Auth:", event);

  if (session && session.user) {
    activarMenuUsuario(session.user);
  } else {
    activarMenuInvitado();
  }
});


// ============================================================
// Cerrar sesión en escritorio y móvil
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const logoutDesktop = document.getElementById("logout-desktop");
  const logoutMobile = document.getElementById("logout-mobile");

  if (logoutDesktop) {
    logoutDesktop.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
    });
  }

  if (logoutMobile) {
    logoutMobile.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
    });
  }
});
