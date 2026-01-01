console.log("🧭 header.js — UI CORE FINAL (AUTH + ADMIN + NOTIFICATIONS)");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
===================================================== */
if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     HELPERS
  ===================================================== */
  function getUserCache() {
    try {
      if (localStorage.getItem("cortero_logged") !== "1") return null;
      return JSON.parse(localStorage.getItem("cortero_user"));
    } catch {
      return null;
    }
  }

  /* =====================================================
     CARRITO — BADGE
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
     CARRITO — TÍTULO CENTRAL
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
     NOTIFICACIONES — BADGE
  ===================================================== */
  function updateNotificationsBadge(count = 0) {
    const badge = $("notifications-count");
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.textContent = "0";
      badge.classList.add("hidden");
    }
  }

  /* =====================================================
     PERFIL + ROL (CLIENTE / ADMIN)
  ===================================================== */
  function syncUserUI() {
    const user = getUserCache();
    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    if (!header || !drawer) return;

    if (!user) {
      header.classList.add("no-user");
      header.classList.remove("logged");
      drawer.classList.add("no-user");
      drawer.classList.remove("logged");
      return;
    }

    /* ---- ESTADO LOGUEADO ---- */
    header.classList.add("logged");
    header.classList.remove("no-user");
    drawer.classList.add("logged");
    drawer.classList.remove("no-user");

    /* ---- AVATAR + TEXTO ---- */
    if ($("avatar-user")) $("avatar-user").src = user.photo_url || "/imagenes/avatar-default.svg";
    if ($("avatar-user-drawer")) $("avatar-user-drawer").src = user.photo_url || "/imagenes/avatar-default.svg";
    if ($("drawer-name")) $("drawer-name").textContent = user.name || "Usuario";
    if ($("drawer-email")) $("drawer-email").textContent = user.email || "";

    /* ---- ADMIN ---- */
    const isAdmin = user.rol === "admin";

    document.querySelectorAll(".admin-only").forEach(el => {
      el.classList.toggle("hidden", !isAdmin);
    });
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
     INIT HEADER
  ===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    console.log("✅ initHeader ejecutado");

    /* ---- HAMBURGUESA ---- */
    $("menu-toggle")?.addEventListener("click", toggleDrawer);

    /* ---- SCRIM ---- */
    $("user-scrim")?.addEventListener("click", closeDrawer);

    /* ---- CARRITO ---- */
    $("cart-btn")?.addEventListener("click", () => {
      location.href = "carrito.html";
    });

    /* ---- NOTIFICACIONES ---- */
    $("notifications-btn")?.addEventListener("click", () => {
      location.href = "notificaciones.html";
    });

    /* ---- LOGOUT ---- */
    $("logout-btn")?.addEventListener("click", () => {
      console.log("🚪 Logout solicitado");

      if (window.supabaseAuth?.logoutUser) {
        window.supabaseAuth.logoutUser(); // delega a corteroLogout
      } else if (window.corteroLogout) {
        window.corteroLogout();
      } else {
        console.error("❌ Logout no disponible");
      }
    });

    /* ---- SYNC ---- */
    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
  }

  /* =====================================================
     EVENTOS GLOBALES
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    document.addEventListener("userLoggedIn", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
      closeDrawer();
    });

    document.addEventListener("userLoggedOut", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
      updateNotificationsBadge(0);
      closeDrawer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* =====================================================
     EXPORTS
  ===================================================== */
  window.initHeader = initHeader;
  window.updateHeaderCartCount = updateCartCount;
  window.updateHeaderCartTitle = updateHeaderCartTitle;
  window.updateNotificationsBadge = updateNotificationsBadge;

  /* =====================================================
     HEADER LISTO
  ===================================================== */
  document.addEventListener("header:ready", () => {
    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
  });
}
