// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — ESTADO SEGURO (ANTI-CRASH)
// ============================================================

console.log("👤 auth-ui.js cargado — UI STATE SAFE");

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

    document.body.classList.remove("logged");
    document.body.classList.add("no-user");

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

    document.body.classList.remove("no-user");
    document.body.classList.add("logged");

    header?.classList.remove("no-user");
    header?.classList.add("logged");

    drawer?.classList.remove("no-user");
    drawer?.classList.add("logged");

    // AVATARES
    const photo = user.photo_url || "/imagenes/avatar-default.svg";
    $("avatar-user")?.setAttribute("src", photo);
    $("avatar-user-drawer")?.setAttribute("src", photo);

    // TEXTOS
    if ($("drawer-name") && user.name) {
      $("drawer-name").textContent = user.name;
    }

    if ($("drawer-email") && user.email) {
      $("drawer-email").textContent = user.email;
    }

    closeDrawer();
  }

  /* =====================================================
     AUTH READY (CONTROLADO)
  ===================================================== */
  function dispatchAuthReadyOnce() {
    if (window.__AUTH_READY__) return;

    window.__AUTH_READY__ = true;
    document.dispatchEvent(new Event("auth:ready"));
    console.log("📣 Evento auth:ready");
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

      if (raw) {
        const user = JSON.parse(raw);

        // 🔑 ESTADO GLOBAL
        window.currentUser = user;

        setLoggedUI(user);
        dispatchAuthReadyOnce();
      } else {
        setGuestUI();
      }
    } catch (e) {
      console.warn("⚠ Error leyendo cortero_user", e);
      setGuestUI();
    }
  }

  /* =====================================================
     EVENTOS EXTERNOS
  ===================================================== */
  document.addEventListener("userLoggedIn", (e) => {
    const user = e.detail || {};

    localStorage.setItem("cortero_user", JSON.stringify(user));
    window.currentUser = user;

    setLoggedUI(user);
    dispatchAuthReadyOnce();
  });

  document.addEventListener("userLoggedOut", () => {
    console.log("👤 UI → logout");

    localStorage.removeItem("cortero_user");
    window.currentUser = null;

    // 🔄 RESET GLOBAL
    window.__AUTH_READY__ = false;

    setGuestUI();
  });

  document.addEventListener("DOMContentLoaded", initAuthUI);

  window.initAuthUI = initAuthUI;
}
