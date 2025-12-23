// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — NO DECIDE AUTH
// ============================================================

console.log("👤 auth-ui.js cargado — UI ONLY");

if (!window.__AUTH_UI_LOADED__) {
  window.__AUTH_UI_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* ========================= HELPERS ========================= */
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  const showAll = (list) => list?.forEach(el => el.classList.remove("hidden"));
  const hideAll = (list) => list?.forEach(el => el.classList.add("hidden"));

  const closeDrawer = () => {
    $("user-drawer")?.classList.remove("open");
    $("user-scrim")?.classList.remove("open");
    document.body.style.overflow = "";
  };

  /* =====================================================
     ESTADO → USUARIO INVITADO
  ===================================================== */
  function resetAuthUI() {
    console.log("👤 UI → invitado");

    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    header?.classList.remove("logged");
    header?.classList.add("no-user");

    drawer?.classList.remove("logged");
    drawer?.classList.add("no-user");

    // NAV PC
    show($("public-nav"));
    hide($("private-nav"));

    // HEADER PC
    show($("login-desktop"));
    hide($("btn-header-user"));

    // DRAWER
    hide(document.querySelector(".user-drawer-header.logged"));
    hideAll(document.querySelectorAll(".user-drawer-item.logged"));
    hide($("logout-btn"));

    showAll(document.querySelectorAll(".user-drawer-item.no-user"));

    closeDrawer();
  }

  /* =====================================================
     ESTADO → USUARIO LOGUEADO
  ===================================================== */
  function setLoggedIn(user = {}) {
    console.log("👤 UI → logueado");

    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    header?.classList.remove("no-user");
    header?.classList.add("logged");

    drawer?.classList.remove("no-user");
    drawer?.classList.add("logged");

    // NAV PC
    hide($("public-nav"));
    show($("private-nav"));

    // HEADER PC
    hide($("login-desktop"));
    show($("btn-header-user"));

    // DRAWER
    show(document.querySelector(".user-drawer-header.logged"));
    showAll(document.querySelectorAll(".user-drawer-item.logged"));
    show($("logout-btn"));

    hideAll(document.querySelectorAll(".user-drawer-item.no-user"));

    // DATOS USUARIO
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
      raw ? setLoggedIn(JSON.parse(raw)) : resetAuthUI();
    } catch {
      resetAuthUI();
    }
  }

  /* =====================================================
     EVENTOS
  ===================================================== */
  document.addEventListener("userLoggedIn", (e) => {
    setLoggedIn(e.detail || {});
  });

  document.addEventListener("userLoggedOut", () => {
    localStorage.removeItem("cortero_user");
    resetAuthUI();
  });

  document.addEventListener("DOMContentLoaded", initAuthUI);

  window.initAuthUI = initAuthUI;
}
