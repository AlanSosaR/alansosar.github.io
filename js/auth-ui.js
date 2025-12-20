// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI + protección automática por URL
// ============================================================

console.log("👤 auth-ui.js cargado — CORE FINAL");

/* ========================= HELPERS ========================= */
const $auth = (id) => document.getElementById(id);

/* ========================= DRAWER ========================= */
function closeDrawerUI() {
  $auth("user-drawer")?.classList.remove("open");
  $auth("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

/* ========================= RESET VISUAL ========================= */
function resetAuthUI() {
  const drawer = $auth("user-drawer");
  const header = document.querySelector(".header-fixed");

  drawer?.classList.remove("logged");
  drawer?.classList.add("no-user");

  header?.classList.remove("logged");
  header?.classList.add("no-user");

  closeDrawerUI();
}

/* ========================= ESTADO LOGUEADO ========================= */
function setLoggedIn(user) {
  resetAuthUI();

  const drawer = $auth("user-drawer");
  const header = document.querySelector(".header-fixed");
  if (!drawer || !header) return;

  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  header.classList.remove("no-user");
  header.classList.add("logged");

  const photo = user?.photo_url || "imagenes/avatar-default.svg";
  $auth("avatar-user")?.setAttribute("src", photo);
  $auth("avatar-user-drawer")?.setAttribute("src", photo);

  $auth("drawer-name")  && ($auth("drawer-name").textContent  = user?.name  || "Usuario");
  $auth("drawer-email") && ($auth("drawer-email").textContent = user?.email || "");

  closeDrawerUI();
}

/* ========================= LOGOUT GLOBAL ========================= */
function hardLogout() {
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  resetAuthUI();

  document.dispatchEvent(new CustomEvent("authStateChanged", {
    detail: { logged: false }
  }));

  window.location.replace("index.html");
}

/* ============================================================
   INIT GLOBAL
============================================================ */
function initAuthUI() {
  console.log("👤 initAuthUI ejecutado");

  const logged = localStorage.getItem("cortero_logged") === "1";
  const raw    = localStorage.getItem("cortero_user");

  const PUBLIC_PAGES = ["", "index.html", "login.html", "registro.html"];
  const currentPage =
    location.pathname.split("/").pop() || "index.html";

  resetAuthUI();

  /* ======== SESIÓN VÁLIDA ======== */
  if (logged && raw) {
    try {
      setLoggedIn(JSON.parse(raw));

      document.dispatchEvent(new CustomEvent("authStateChanged", {
        detail: { logged: true }
      }));
      return;
    } catch {
      localStorage.removeItem("cortero_user");
      localStorage.removeItem("cortero_logged");
    }
  }

  /* ======== PROTECCIÓN DE RUTAS ======== */
  // ❗ NUNCA redirigir login ni registro
  if (
    !logged &&
    !PUBLIC_PAGES.includes(currentPage) &&
    currentPage !== "login.html" &&
    currentPage !== "registro.html"
  ) {
    window.location.replace("index.html");
  }
}

/* ========================= EVENTOS ========================= */

// Login exitoso (desde login.js)
document.addEventListener("userLoggedIn", (e) => {
  if (!e.detail) return;

  localStorage.setItem("cortero_logged", "1");
  localStorage.setItem("cortero_user", JSON.stringify(e.detail));

  setLoggedIn(e.detail);

  document.dispatchEvent(new CustomEvent("authStateChanged", {
    detail: { logged: true }
  }));
});

// Logout desde cualquier lugar
document.addEventListener("userLoggedOut", hardLogout);

/* ========================= AUTO INIT ========================= */
document.addEventListener("DOMContentLoaded", initAuthUI);
