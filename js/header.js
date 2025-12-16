// =====================================================
// HEADER.JS — Café Cortero (GLOBAL)
// Controla SOLO el header y el drawer
// =====================================================

console.log("🧭 header.js cargado");

/* =========================
   HELPER
========================= */
function safe(id) {
  return document.getElementById(id);
}

/* =========================
   INIT HEADER
========================= */
function initHeader() {
  const drawer     = safe("user-drawer");
  const scrim      = safe("user-scrim");
  const menuToggle = safe("menu-toggle");
  const logoutBtn  = safe("logout-btn");

  if (!drawer || !scrim) return;

  function openDrawer() {
    drawer.classList.add("open");
    scrim.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* =========================
     HAMBURGUESA (MÓVIL)
  ========================= */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    drawer.classList.contains("open") ? closeDrawer() : openDrawer();
  });

  /* =========================
     AVATAR (DESKTOP)
  ========================= */
  document.addEventListener("click", (e) => {
    const avatarBtn = e.target.closest("#btn-header-user");
    if (!avatarBtn) return;

    e.preventDefault();
    e.stopPropagation();
    openDrawer();
  });

  /* =========================
     SCRIM
  ========================= */
  scrim.addEventListener("click", closeDrawer);

  /* =========================
     LOGOUT (CIERRA DRAWER)
     auth-ui.js maneja la sesión
  ========================= */
  logoutBtn?.addEventListener("click", () => {
    closeDrawer();
  });

  /* =========================
     ESC PARA CERRAR
  ========================= */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

/* =========================
   ESPERAR HEADER INYECTADO
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    if (safe("user-drawer")) {
      initHeader();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
