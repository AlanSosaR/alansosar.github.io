// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — SIN ESCUCHAR SUPABASE DIRECTO
// ============================================================

console.log("👤 auth-ui.js cargado — UI ONLY");

/* ============================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
============================================================ */
if (window.__AUTH_UI_LOADED__) {
  console.warn("⚠️ auth-ui.js ya estaba cargado");
} else {
  window.__AUTH_UI_LOADED__ = true;

  /* ========================= HELPERS ========================= */
  const $ = (id) => document.getElementById(id);

  function isLoginPage() {
    return document.body.dataset.page === "login";
  }

  /* ========================= DRAWER ========================= */
  function closeDrawerUI() {
    $("user-drawer")?.classList.remove("open");
    $("user-scrim")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ========================= HEADER LINKS ========================= */
  function toggleHeaderLinks(isLogged) {
    $("public-nav")?.classList.toggle("hidden", isLogged);
    $("private-nav")?.classList.toggle("hidden", !isLogged);
  }

  /* ========================= RESET VISUAL ========================= */
  function resetAuthUI() {
    const drawer = $("user-drawer");
    const header = document.querySelector(".header-fixed");

    drawer?.classList.remove("logged");
    drawer?.classList.add("no-user");

    header?.classList.remove("logged");
    header?.classList.add("no-user");

    toggleHeaderLinks(false);
    closeDrawerUI();
  }

  /* ========================= ESTADO LOGUEADO ========================= */
  function setLoggedIn(user = {}) {
    const drawer = $("user-drawer");
    const header = document.querySelector(".header-fixed");
    if (!drawer || !header) return;

    drawer.classList.remove("no-user");
    drawer.classList.add("logged");

    header.classList.remove("no-user");
    header.classList.add("logged");

    const photo = user.photo_url || "imagenes/avatar-default.svg";
    $("avatar-user")?.setAttribute("src", photo);
    $("avatar-user-drawer")?.setAttribute("src", photo);

    if (user.name) $("drawer-name") && ($("drawer-name").textContent = user.name);
    if (user.email) $("drawer-email") && ($("drawer-email").textContent = user.email);

    toggleHeaderLinks(true);
    closeDrawerUI();
  }

  /* ============================================================
     INIT AUTH UI — SOLO UI
  ============================================================ */
  function initAuthUI() {
    if (window.__AUTH_UI_INIT__) return;
    window.__AUTH_UI_INIT__ = true;

    console.log("👤 initAuthUI ejecutado (UI)");

    if (isLoginPage()) {
      console.warn("⛔ auth-ui deshabilitado en login.html");
      return;
    }

    // Estado inicial basado en localStorage (opcional)
    try {
      const raw = localStorage.getItem("cortero_user");
      if (raw) {
        setLoggedIn(JSON.parse(raw));
      } else {
        resetAuthUI();
      }
    } catch {
      resetAuthUI();
    }
  }

  /* ========================= EVENTOS GLOBALES ========================= */

  // Login exitoso (emitido desde supabase-client-core.js)
  document.addEventListener("userLoggedIn", (e) => {
    setLoggedIn(e.detail || {});
  });

  // Logout (emitido desde supabase-client-core.js o header)
  document.addEventListener("userLoggedOut", () => {
    resetAuthUI();
  });

  /* ========================= EXPORT ========================= */
  window.initAuthUI = initAuthUI;
}
