console.log("🧭 header.js — UI CORE FINAL (AUTH SAFE)");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
===================================================== */
if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     CARRITO — BADGE (ICONO)
  ===================================================== */
  function updateCartCount() {
    const badge = $("cart-count");
    if (!badge) return;

    try {
      const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
      const total = cart.reduce((a, i) => a + Number(i.qty || 0), 0);
      badge.textContent = total;
    } catch {
      badge.textContent = "0";
    }
  }

  /* =====================================================
     CARRITO — TÍTULO CENTRAL (0 cafés)
  ===================================================== */
  function updateHeaderCartTitle() {
    const label = $("count-items");
    if (!label) return;

    try {
      const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
      const total = cart.reduce((s, i) => s + Number(i.qty || 0), 0);
      label.textContent = `${total} ${total === 1 ? "café" : "cafés"}`;
    } catch {
      label.textContent = "0 cafés";
    }
  }

  /* =====================================================
     EXPORTAR PARA OTROS MÓDULOS
  ===================================================== */
  window.updateHeaderCartCount = updateCartCount;
  window.updateHeaderCartTitle = updateHeaderCartTitle;

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
     INIT HEADER (UI BASE)
  ===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    console.log("✅ initHeader ejecutado (UI only)");

    /* ---------------- HAMBURGUESA ---------------- */
    $("menu-toggle")?.addEventListener("click", toggleDrawer);

    /* ---------------- SCRIM ---------------- */
    $("user-scrim")?.addEventListener("click", closeDrawer);

    /* ---------------- CARRITO ---------------- */
    $("cart-btn")?.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });

    /* =====================================================
       LOGOUT — CONEXIÓN REAL (FIX DEFINITIVO)
    ===================================================== */
    const logoutBtn = $("logout-btn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        console.log("🚪 Click en Cerrar sesión");

        // Delegar SIEMPRE al logout principal
        if (window.supabaseAuth?.logoutUser) {
          window.supabaseAuth.logoutUser(); // → corteroLogout()
        } else if (window.corteroLogout) {
          window.corteroLogout();
        } else {
          console.error("❌ No existe función de logout");
        }
      });
    } else {
      console.warn("⚠️ logout-btn no encontrado (header aún no inyectado)");
    }

    /* ---------------- SINCRONIZAR ---------------- */
    updateCartCount();
    updateHeaderCartTitle();
  }

  /* =====================================================
     EVENTOS GLOBALES
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    document.addEventListener("userLoggedIn", () => {
      updateCartCount();
      updateHeaderCartTitle();
      closeDrawer();
    });

    document.addEventListener("userLoggedOut", () => {
      updateCartCount();
      updateHeaderCartTitle();
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

  /* =====================================================
     CUANDO EL HEADER YA EXISTE EN DOM
  ===================================================== */
  document.addEventListener("header:ready", () => {
    updateCartCount();
    updateHeaderCartTitle();
  });
}
