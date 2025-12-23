console.log("🧭 header.js — UI CORE FINAL (AUTH SAFE)");

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

    // Abrir / cerrar drawer
    $("menu-toggle")?.addEventListener("click", toggleDrawer);
    $("btn-header-user")?.addEventListener("click", toggleDrawer);
    $("user-scrim")?.addEventListener("click", closeDrawer);

    // 🔑 LOGOUT REAL (NO UI FAKE)
    $("logout-btn")?.addEventListener("click", async () => {
      if (typeof window.corteroLogout === "function") {
        await window.corteroLogout(); // Supabase signOut real
      }
      closeDrawer();
    });

    // Carrito
    $("cart-btn")?.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });

    updateCartCount();
  }

  /* =====================================================
     EVENTOS GLOBALES (UI REACTIVA)
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    // Auth → solo UX (NO decide sesión)
    document.addEventListener("userLoggedIn", () => {
      updateCartCount();
      closeDrawer();
    });

    document.addEventListener("userLoggedOut", () => {
      updateCartCount();
      closeDrawer();
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
