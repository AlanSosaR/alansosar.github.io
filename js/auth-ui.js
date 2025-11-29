// ============================================================
// AUTH-UI — Versión FINAL 2025
// Controla SOLO la interfaz del menú (no la sesión)
// ============================================================

console.log("👤 auth-ui.js cargado — versión FINAL 2025");

// Helper
function safe(id) {
  return document.getElementById(id) || null;
}

/* ============================================================
   MOSTRAR ESTADOS
============================================================ */
function showLoggedOut() {
  const loginDesktop = safe("login-desktop");
  const profileDesktop = safe("profile-desktop");
  const drawerDefault = safe("drawer-links-default");
  const drawerLogged = safe("drawer-links-logged");

  if (loginDesktop) loginDesktop.style.display = "inline-block";
  if (profileDesktop) profileDesktop.style.display = "none";

  if (drawerDefault) drawerDefault.style.display = "flex";
  if (drawerLogged) drawerLogged.style.display = "none";
}

function showLoggedIn(user) {
  const name = user?.name || "Usuario";
  const photo = user?.photo_url || "imagenes/avatar-default.svg";

  // Escritorio
  if (safe("login-desktop")) safe("login-desktop").style.display = "none";
  if (safe("profile-desktop")) safe("profile-desktop").style.display = "flex";

  if (safe("profile-photo-desktop")) safe("profile-photo-desktop").src = photo;
  if (safe("hello-desktop")) safe("hello-desktop").textContent = `Hola, ${name}`;

  // Móvil
  if (safe("drawer-links-default")) safe("drawer-links-default").style.display = "none";
  if (safe("drawer-links-logged")) safe("drawer-links-logged").style.display = "flex";

  if (safe("profile-photo-mobile")) safe("profile-photo-mobile").src = photo;
  if (safe("hello-mobile")) safe("hello-mobile").textContent = `Hola, ${name}`;
}

/* ============================================================
   ACTIVAR LOGOUT
============================================================ */
function activarLogout() {
  async function doLogout(e) {
    if (e) e.preventDefault();

    console.log("🚪 Logout desde UI…");

    // Solo llama a la función central
    if (window.supabaseAuth?.logoutUser) {
      await window.supabaseAuth.logoutUser();
    }

    showLoggedOut();
    window.location.replace("index.html");
  }

  const logoutDesktop = safe("logout-desktop");
  const logoutMobile = safe("logout-mobile");

  if (logoutDesktop) logoutDesktop.addEventListener("click", doLogout);
  if (logoutMobile) logoutMobile.addEventListener("click", doLogout);
}

/* ============================================================
   MENÚ DESPLEGABLE — ESCRITORIO
============================================================ */
function activarToggleMenuEscritorio() {
  const wrapper = safe("profile-desktop");
  const menu = safe("profile-menu");

  if (!wrapper || !menu) return;

  wrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      menu.classList.remove("open");
    }
  });
}

/* ============================================================
   EVENTOS GLOBALES EMITIDOS POR SUPABASE-CLIENT.JS
============================================================ */
document.addEventListener("userLoggedIn", (e) => {
  console.log("🎉 userLoggedIn recibido en UI");
  showLoggedIn(e.detail);
});

document.addEventListener("userLoggedOut", () => {
  console.log("👋 userLoggedOut recibido en UI");
  showLoggedOut();
});

/* ============================================================
   EVENTOS DESDE PERFIL
============================================================ */
document.addEventListener("userPhotoUpdated", (e) => {
  const newPhoto = e.detail.photo_url;
  if (safe("profile-photo-desktop")) safe("profile-photo-desktop").src = newPhoto;
  if (safe("profile-photo-mobile")) safe("profile-photo-mobile").src = newPhoto;
});

document.addEventListener("userDataUpdated", () => {
  const raw = localStorage.getItem("cortero_user");
  if (raw) showLoggedIn(JSON.parse(raw));
});

/* ============================================================
   INIT UI
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  activarLogout();
  activarToggleMenuEscritorio();

  // Sincroniza el estado inicial
  const raw = localStorage.getItem("cortero_user");
  if (raw) showLoggedIn(JSON.parse(raw));
  else showLoggedOut();
});
