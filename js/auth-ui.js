// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — ESTADO LIMPIO (SIN CONFLICTOS)
// ============================================================

console.log("👤 auth-ui.js cargado — UI STATE ONLY");

if (!window.__AUTH_UI_LOADED__) {
  window.__AUTH_UI_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     HELPERS
  ===================================================== */
  const closeDrawer = () => {
    $("user-drawer")?.classList.remove("open");
    $("user-scrim")?.classList.remove("open");
    document.body.style.overflow = "";
  };

  /* =====================================================
     ESTADO → INVITADO
  ===================================================== */
  function setGuestUI() {
    console.log("👤 UI → invitado");

    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    header?.classList.remove("logged");
    header?.classList.add("no-user");

    drawer?.classList.remove("logged");
    drawer?.classList.add("no-user");

    closeDrawer();
  }

  /* =====================================================
     ESTADO → LOGUEADO
  ===================================================== */
  function setLoggedUI(user = {}) {
    console.log("👤 UI → logueado");

    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    header?.classList.remove("no-user");
    header?.classList.add("logged");

    drawer?.classList.remove("no-user");
    drawer?.classList.add("logged");

    // Datos del usuario (NO layout)
    const photo = user.photo_url || "imagenes/avatar-default.svg";
    $("avatar-user")?.setAttribute("src", photo);
    $("avatar-user-drawer")?.setAttribute("src", photo);

    if (user.name) $("drawer-name").textContent = user.name;
    if (user.email) $("drawer-email").textContent = user.email;

    closeDrawer();
  }

  /* =====================================================
     INIT
  ===================================================== */
  function initAuthUI() {
    if (window.__AUTH_UI_INIT__) return;
    window.__AUTH_UI_INIT__ = true;

    console.log("👤 initAuthUI");

    try {
      const raw = localStorage.getItem("cortero_user");
      raw ? setLoggedUI(JSON.parse(raw)) : setGuestUI();
    } catch {
      setGuestUI();
    }
  }

  /* =====================================================
     EVENTOS
  ===================================================== */
  document.addEventListener("userLoggedIn", (e) => {
    setLoggedUI(e.detail || {});
  });

  document.addEventListener("userLoggedOut", () => {
    localStorage.removeItem("cortero_user");
    setGuestUI();
  });

  document.addEventListener("DOMContentLoaded", initAuthUI);

  window.initAuthUI = initAuthUI;
}
