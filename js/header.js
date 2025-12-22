console.log("🧭 header.js — UI CORE (COMPATIBLE CON auth-ui)");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
===================================================== */
if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     CARRITO (LECTURA SOLAMENTE)
  ===================================================== */
  function updateCartCount() {
    const badge = $("cart-count");
    if (!badge) return;

    try {
      const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
      badge.textContent = cart.reduce((a, i) => a + i.qty, 0);
    } catch {
      badge.textContent = "0";
    }
  }

  /* =====================================================
     DRAWER
  ===================================================== */
  function openDrawer() {
    $("user-drawer")?.classList.add("open");
    $("user-scrim")?.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    $("user-drawer")?.classList.remove("open");
    $("user-scrim")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function toggleDrawer() {
    $("user-drawer")?.classList.contains("open")
      ? closeDrawer()
      : openDrawer();
  }

  /* =====================================================
     INIT HEADER (EVENTOS UI)
  ===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    console.log("✅ initHeader ejecutado (UI only)");

    // Drawer
    $("menu-toggle")?.addEventListener("click", toggleDrawer);
    $("btn-header-user")?.addEventListener("click", toggleDrawer);
    $("user-scrim")?.addEventListener("click", closeDrawer);

    // Logout → delega a auth-ui.js
    $("logout-btn")?.addEventListener("click", () => {
      document.dispatchEvent(new Event("userLoggedOut"));
      closeDrawer();
    });

    // Carrito
    $("cart-btn")?.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });

    updateCartCount();
  }

  /* =====================================================
     EVENTOS GLOBALES
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    // 🔑 REACCIÓN AL AUTH (NO DECIDE NADA)
    document.addEventListener("authStateChanged", (e) => {
      const logged = e.detail?.logged === true;

      // Header solo ajusta UX
      if (!logged) {
        closeDrawer();
      }

      updateCartCount();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* =====================================================
     EXPORT
  ===================================================== */
  window.initHeader = initHeader;
}
