// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — NO DECIDE AUTH
// ============================================================

console.log("👤 auth-ui.js cargado — UI ONLY");

if (window.__AUTH_UI_LOADED__) {
  console.warn("⚠️ auth-ui.js ya estaba cargado");
} else {
  window.__AUTH_UI_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     HELPERS
  ===================================================== */
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  /* =====================================================
     RESET → USUARIO INVITADO
  ===================================================== */
  function resetAuthUI() {
    console.log("👤 UI → invitado");

    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    header?.classList.remove("logged");
    header?.classList.add("no-user");

    drawer?.classList.remove("logged");
    drawer?.classList.add("no-user");

    // NAVS
    show($("public-nav"));
    hide($("private-nav"));

    // HEADER
    show($("login-desktop"));
    hide($("btn-header-user"));

    // DRAWER
    hide(document.querySelector(".user-drawer-header.logged"));
    hide(document.querySelector(".user-drawer-item.logout"));
    hide(document.querySelectorAll(".user-drawer-item.logged"));

    show(document.querySelector(".user-drawer-item.login"));
  }

  /* =====================================================
     SET → USUARIO LOGUEADO
  ===================================================== */
  function setLoggedIn(user = {}) {
    console.log("👤 UI → logueado");

    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    header?.classList.remove("no-user");
    header?.classList.add("logged");

    drawer?.classList.remove("no-user");
    drawer?.classList.add("logged");

    // NAVS
    hide($("public-nav"));
    show($("private-nav"));

    // HEADER
    hide($("login-desktop"));
    show($("btn-header-user"));

    // DRAWER
    show(document.querySelector(".user-drawer-header.logged"));
    show(document.querySelectorAll(".user-drawer-item.logged"));
    show(document.querySelector(".user-drawer-item.logout"));

    hide(document.querySelector(".user-drawer-item.login"));

    // DATOS USUARIO
    const photo = user.photo_url || "imagenes/avatar-default.svg";
    $("avatar-user")?.setAttribute("src", photo);
    $("avatar-user-drawer")?.setAttribute("src", photo);

    if (user.name) $("drawer-name").textContent = user.name;
    if (user.email) $("drawer-email").textContent = user.email;
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
    resetAuthUI();
  });

  window.initAuthUI = initAuthUI;
}
