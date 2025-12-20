// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI + protección automática por URL
// ============================================================

console.log("👤 auth-ui.js cargado — CORE FINAL");

/* ========================= HELPERS ========================= */
const safe = (id) => document.getElementById(id);

/* ========================= DRAWER ========================= */
function closeDrawerUI() {
  safe("user-drawer")?.classList.remove("open");
  safe("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

/* ========================= RESET VISUAL ========================= */
function resetAuthUI() {
  const drawer = safe("user-drawer");
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

  const drawer = safe("user-drawer");
  const header = document.querySelector(".header-fixed");
  if (!drawer || !header) return;

  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  header.classList.remove("no-user");
  header.classList.add("logged");

  const photo = user?.photo_url || "imagenes/avatar-default.svg";
  safe("avatar-user")?.setAttribute("src", photo);
  safe("avatar-user-drawer")?.setAttribute("src", photo);

  safe("drawer-name")  && (safe("drawer-name").textContent  = user?.name  || "Usuario");
  safe("drawer-email") && (safe("drawer-email").textContent = user?.email || "");

  closeDrawerUI();
}

/* ========================= LOGOUT GLOBAL ========================= */
function hardLogout() {
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  resetAuthUI();

  // 🔔 notificar a todo el sistema
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
  const currentPage = location.pathname.split("/").pop() || "index.html";

  resetAuthUI();

  // Sesión válida
  if (logged && raw) {
    try {
      setLoggedIn(JSON.parse(raw));

      document.dispatchEvent(new CustomEvent("authStateChanged", {
        detail: { logged: true }
      }));
      return;
    } catch {}
  }

  // Protección de rutas
  if (!PUBLIC_PAGES.includes(currentPage) && !logged) {
    window.location.replace("index.html");
  }
}

/* ========================= EVENTOS ========================= */

// Login exitoso
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
