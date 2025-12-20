// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI + protección de páginas (SIN backend)
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

/* ========================= RESET VISUAL (NO TOCA STORAGE) ========================= */
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

/* ========================= LOGOUT REAL ========================= */
function hardLogout() {
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  resetAuthUI();
  window.location.replace("index.html");
}

/* ============================================================
   INIT GLOBAL — ESTABLE, SIN LOOP, SIN BLOQUEAR LOGIN
============================================================ */
function initAuthUI() {
  console.log("👤 initAuthUI ejecutado");

  const logged = localStorage.getItem("cortero_logged");
  const raw    = localStorage.getItem("cortero_user");

  const PUBLIC_PAGES = ["", "index.html", "login.html", "registro.html"];
  const currentPage = location.pathname.split("/").pop();

  // 🔹 Siempre limpiar UI primero (visual)
  resetAuthUI();

  // 🔹 Reactivar SOLO si la sesión es válida
  if (logged === "1" && raw) {
    try {
      setLoggedIn(JSON.parse(raw));
      return;
    } catch (e) {
      console.warn("⚠️ Usuario corrupto");
    }
  }

  // 🔐 Protección SOLO para páginas privadas
  if (window.PAGE_PROTECTED === true && !PUBLIC_PAGES.includes(currentPage)) {
    console.warn("⛔ Página protegida sin sesión");
    window.location.replace("index.html");
  }
}

/* ========================= EVENTOS GLOBALES ========================= */

// Login correcto (login.js / Supabase)
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
