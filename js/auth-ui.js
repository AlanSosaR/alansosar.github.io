// ============================================================
// AUTH-UI.JS — Versión FINAL V7 (2025)
// Menú escritorio + menú móvil + logout + foto + safe mode
// ============================================================

console.log("👤 auth-ui.js cargado — versión FINAL V7");

// ------------------------------
// Helper seguro
// ------------------------------
function safe(id) {
  return document.getElementById(id) || null;
}

// ------------------------------
// Esperar a que Supabase cargue
// ------------------------------
async function esperarSupabaseUI() {
  let i = 0;
  while (!window.supabaseClient && i < 100) {
    await new Promise(res => setTimeout(res, 30));
    i++;
  }
  return window.supabaseClient;
}

// ------------------------------
// MENÚ: ESTADOS
// ------------------------------
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
  const loginDesktop = safe("login-desktop");
  const profileDesktop = safe("profile-desktop");
  const photoDesk = safe("profile-photo-desktop");
  const helloDesk = safe("hello-desktop");

  if (loginDesktop) loginDesktop.style.display = "none";
  if (profileDesktop) profileDesktop.style.display = "flex";
  if (photoDesk) photoDesk.src = photo;
  if (helloDesk) helloDesk.textContent = `Hola, ${name}`;

  // Móvil
  const drawerDefault = safe("drawer-links-default");
  const drawerLogged = safe("drawer-links-logged");
  const photoMob = safe("profile-photo-mobile");
  const helloMob = safe("hello-mobile");

  if (drawerDefault) drawerDefault.style.display = "none";
  if (drawerLogged) drawerLogged.style.display = "flex";
  if (photoMob) photoMob.src = photo;
  if (helloMob) helloMob.textContent = `Hola, ${name}`;
}

// ------------------------------
// MENÚ SEGÚN LOCALSTORAGE
// ------------------------------
function refreshMenuFromStorage() {
  const logged = localStorage.getItem("cortero_logged");
  const rawUser = localStorage.getItem("cortero_user");

  if (logged !== "1" || !rawUser) return showLoggedOut();

  try {
    const user = JSON.parse(rawUser);
    showLoggedIn(user);
  } catch {
    showLoggedOut();
  }
}

// ------------------------------
// TOGGLE MENÚ PERFIL ESCRITORIO
// ------------------------------
function activarToggleMenuEscritorio() {
  const profileWrapper = safe("profile-desktop");
  const profileMenu = safe("profile-menu");

  if (!profileWrapper || !profileMenu) return;

  profileWrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
  });

  // Click afuera → cerrar
  document.addEventListener("click", (e) => {
    if (!profileWrapper.contains(e.target)) {
      profileMenu.classList.remove("open");
    }
  });
}

// ------------------------------
// LOGOUT REAL 100% FIJO
// ------------------------------
async function activarLogout(sb) {
  async function doLogout(e) {
    if (e) e.preventDefault();

    console.log("🚪 Cerrando sesión…");

    try {
      await sb.auth.signOut();
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    }

    // Limpiar todo
    localStorage.removeItem("cortero_logged");
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero-session");

    showLoggedOut();

    window.location.replace("index.html");
  }

  const logoutDesktop = safe("logout-desktop");
  const logoutMobile = safe("logout-mobile");

  if (logoutDesktop) logoutDesktop.addEventListener("click", doLogout);
  if (logoutMobile) logoutMobile.addEventListener("click", doLogout);
}

// ------------------------------
// EVENTOS GLOBALS: foto + datos
// ------------------------------
function activarEventosGlobales() {
  document.addEventListener("userPhotoUpdated", (e) => {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return;

    const data = JSON.parse(raw);
    data.photo_url = e.detail.photo_url;

    localStorage.setItem("cortero_user", JSON.stringify(data));
    refreshMenuFromStorage();
  });

  document.addEventListener("userDataUpdated", () => {
    refreshMenuFromStorage();
  });
}

// ------------------------------
// INIT
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const sb = await esperarSupabaseUI();

  refreshMenuFromStorage();
  activarEventosGlobales();
  activarLogout(sb);
  activarToggleMenuEscritorio();

  // Listener Supabase (fallback)
  sb.auth.onAuthStateChange(() => refreshMenuFromStorage());
});
