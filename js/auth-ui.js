// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI + protección (SIN backend)
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

/* ========================= UI RESET (NO TOCA STORAGE) ========================= */
function resetAuthUI() {
  const drawer = safe("user-drawer");
  const header = document.querySelector(".header-fixed");

  drawer?.classList.remove("logged");
  drawer?.classList.add("no-user");

  header?.classList.remove("logged");
  header?.classList.add("no-user");

  closeDrawerUI();
}

/* ========================= UI LOGUEADA ========================= */
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

/* ========================= LOGOUT REAL ========================= */
function hardLogout() {
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  resetAuthUI();
  window.location.replace("index.html");
}

/* ========================= INIT GLOBAL ========================= */
function initAuthUI() {
  console.log("👤 initAuthUI ejecutado");

  const logged = localStorage.getItem("cortero_logged");
  const raw    = localStorage.getItem("cortero_user");

  // 🔹 Siempre limpiar UI primero (visual)
  resetAuthUI();

  // 🔹 Reactivar SOLO si hay sesión válida
  if (logged === "1" && raw) {
    try {
      setLoggedIn(JSON.parse(raw));
      return;
    } catch {}
  }

  // 🔐 Protección páginas privadas
  if (window.PAGE_PROTECTED && logged !== "1") {
    window.location.replace("index.html");
  }
}

/* ========================= EVENTOS ========================= */

// Login correcto
document.addEventListener("userLoggedIn", (e) => {
  if (!e.detail) return;

  localStorage.setItem("cortero_logged", "1");
  localStorage.setItem("cortero_user", JSON.stringify(e.detail));

  setLoggedIn(e.detail);
});

// Logout desde cualquier parte
document.addEventListener("userLoggedOut", hardLogout);

/* ========================= AUTO INIT ========================= */
document.addEventListener("DOMContentLoaded", initAuthUI);
