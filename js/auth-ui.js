// ============================================================
// AUTH-UI — Café Cortero (2025)
// Controla SOLO la UI + protección de páginas
// NO maneja backend
// ============================================================

console.log("👤 auth-ui.js cargado — CORE FINAL");

/* ========================= HELPERS ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= CIERRE DRAWER ========================= */
function closeDrawerUI() {
  const drawer = safe("user-drawer");
  const scrim  = safe("user-scrim");

  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  if (scrim) {
    scrim.classList.remove("open");
  }

  document.body.style.overflow = "";
}

/* ========================= ESTADO LOGUEADO ========================= */
function setLoggedIn(user) {
  const drawer = safe("user-drawer");
  const header = document.querySelector(".header-fixed");
  if (!drawer || !header) return;

  /* Drawer */
  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  /* Header */
  header.classList.remove("no-user");
  header.classList.add("logged");

  /* Avatar */
  const photo = user?.photo_url || "imagenes/avatar-default.svg";
  safe("avatar-user")?.setAttribute("src", photo);
  safe("avatar-user-drawer")?.setAttribute("src", photo);

  /* Textos drawer */
  safe("drawer-name")  && (safe("drawer-name").textContent  = user?.name  || "Usuario");
  safe("drawer-email") && (safe("drawer-email").textContent = user?.email || "");

  closeDrawerUI();
}

/* ========================= ESTADO INVITADO ========================= */
function setLoggedOut() {
  // 🔒 LIMPIEZA TOTAL
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  const drawer = safe("user-drawer");
  const header = document.querySelector(".header-fixed");

  if (drawer) {
    drawer.classList.remove("logged");
    drawer.classList.add("no-user");
  }

  if (header) {
    header.classList.remove("logged");
    header.classList.add("no-user");
  }

  closeDrawerUI();
}

/* ============================================================
   INIT — PROTECCIÓN GLOBAL DE PÁGINAS
   SE EJECUTA EN TODAS LAS PÁGINAS
============================================================ */
function initAuthUI() {
  console.log("👤 initAuthUI ejecutado");

  const logged = localStorage.getItem("cortero_logged");
  const raw    = localStorage.getItem("cortero_user");

  /* ===== SESIÓN VÁLIDA ===== */
  if (logged === "1" && raw) {
    try {
      setLoggedIn(JSON.parse(raw));
      return;
    } catch (e) {
      console.warn("⚠️ Usuario corrupto");
    }
  }

  /* ===== SESIÓN INVÁLIDA ===== */
  setLoggedOut();

  // 🔥 BLOQUEO GLOBAL DE PÁGINAS PRIVADAS
  const PUBLIC_PAGES = [
    "",                 // raíz
    "index.html",
    "login.html",
    "registro.html"
  ];

  const currentPage = location.pathname.split("/").pop();

  if (!PUBLIC_PAGES.includes(currentPage)) {
    console.warn("⛔ Página protegida sin sesión → redirección forzada");
    window.location.replace("index.html");
  }
}

/* ========================= EVENTOS GLOBALES ========================= */

// Login correcto (disparado desde Supabase / login.js)
document.addEventListener("userLoggedIn", (e) => {
  if (!e.detail) return;

  localStorage.setItem("cortero_logged", "1");
  localStorage.setItem("cortero_user", JSON.stringify(e.detail));

  setLoggedIn(e.detail);
});

// Logout desde cualquier parte (header, admin, etc.)
document.addEventListener("userLoggedOut", () => {
  setLoggedOut();

  // 🔥 EXPULSIÓN GLOBAL
  window.location.replace("index.html");
});

/* ========================= AUTO INIT ========================= */
document.addEventListener("DOMContentLoaded", initAuthUI);
