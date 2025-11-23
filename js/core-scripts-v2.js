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
  removeItem: (key) => sessionStorage.removeItem(key),
};

// 🟢 Crear un solo cliente global
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


// =====================================================================
// 🚀 FIX DEFINITIVO DEL MENÚ — AUTO DETECTA LOGIN / LOGOUT
// =====================================================================

// ⚠ IMPORTANTE: estos IDs deben existir en tu HTML
// <div id="menu-guest"></div>  → menú cuando NO hay sesión
// <div id="menu-user"></div>   → menú cuando SÍ hay sesión
// <span id="user-name"></span> → nombre del usuario
// <img id="user-avatar">       → avatar del usuario

function actualizarMenuUsuario(user) {
  const menuGuest = document.getElementById("menu-guest");
  const menuUser = document.getElementById("menu-user");
  const nameElem = document.getElementById("user-name");
  const avatarElem = document.getElementById("user-avatar");

  if (menuGuest) menuGuest.style.display = "none";
  if (menuUser) menuUser.style.display = "flex"; // flex para Material 3

  if (nameElem) {
    nameElem.textContent = user.user_metadata.full_name || "Usuario";
  }

  if (avatarElem) {
    avatarElem.src = user.user_metadata.photo_url || "/imagenes/avatar-default.svg";
  }

  console.log("👤 Menú actualizado → usuario logueado");
}

function actualizarMenuInvitado() {
  const menuGuest = document.getElementById("menu-guest");
  const menuUser = document.getElementById("menu-user");

  if (menuGuest) menuGuest.style.display = "flex";
  if (menuUser) menuUser.style.display = "none";

  console.log("👤 Menú actualizado → invitado");
}


// =====================================================================
// 🧠 LISTENER GLOBAL — DETECTA LOGIN, LOGOUT Y REFRESCO DE TOKEN
// =====================================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento de Auth:", event);

  if (session && session.user) {
    actualizarMenuUsuario(session.user);
  } else {
    actualizarMenuInvitado();
  }
});
