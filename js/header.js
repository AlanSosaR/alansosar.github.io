console.log("🧭 header.js — CORE FINAL ESTABLE");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA (CORRECTO)
===================================================== */
if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  /* =====================================================
     HELPERS
  ===================================================== */
  const $ = (id) => document.getElementById(id);

  /* =====================================================
     CARRITO (LECTURA SOLAMENTE)
     ❌ NO declara CART_KEY
  ===================================================== */
  function updateCartCount() {
    const badge = $("cart-count");
    if (!badge) return;

    try {
      const cart = JSON.parse(
        localStorage.getItem("cafecortero_cart")
      ) || [];
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
     AUTH UI — SOLO CLASES
  ===================================================== */
  function updateAuthUI(isLogged) {
    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");
    if (!header || !drawer) return;

    header.classList.toggle("logged", isLogged);
    header.classList.toggle("no-user", !isLogged);
    drawer.classList.toggle("logged", isLogged);
    drawer.classList.toggle("no-user", !isLogged);
  }

  /* =====================================================
     INIT HEADER — LLAMADO DESDE layout.js
  ===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    console.log("✅ initHeader ejecutado");

    $("menu-toggle")?.addEventListener("click", toggleDrawer);
    $("btn-header-user")?.addEventListener("click", toggleDrawer);
    $("user-scrim")?.addEventListener("click", closeDrawer);

    $("logout-btn")?.addEventListener("click", () => {
      localStorage.removeItem("cortero_user");
      localStorage.removeItem("cortero_logged");
      updateAuthUI(false);
      closeDrawer();
    });

    $("cart-btn")?.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });

    updateAuthUI(
      localStorage.getItem("cortero_logged") === "1"
    );
    updateCartCount();
  }

  /* =====================================================
     EVENTOS GLOBALES — UNA SOLA VEZ
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    document.addEventListener("authStateChanged", (e) => {
      updateAuthUI(e.detail?.logged === true);
      updateCartCount();
      closeDrawer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* =====================================================
     EXPORT GLOBAL
  ===================================================== */
  window.initHeader = initHeader;
}
