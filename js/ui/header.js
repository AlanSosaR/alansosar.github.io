console.log("🧭 header.js — UI CORE LIMPIO (CON HOOKS COMPLETOS)");

if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     HELPERS — USUARIO
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
     🔔 BADGE GLOBAL (MENÚ + AVATAR)
  ===================================================== */
  function toggleGlobalNotificationDot(show) {
    const menuBadge = $("menu-notification-badge");
    const avatarBadge = $("avatar-notification-badge");

    [menuBadge, avatarBadge].forEach(badge => {
      if (!badge) return;
      badge.classList.toggle("hidden", !show);
    });
  }

  window.toggleGlobalNotificationDot = toggleGlobalNotificationDot;

  /* =====================================================
     📦 BADGES — PEDIDOS (ADMIN / CLIENTE)
  ===================================================== */
  function setAdminOrdersCount(count) {
    const badge = $("admin-orders-count");
    if (!badge) return;

    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  }

  function setMyOrdersCount(count) {
    const badge = $("my-orders-count");
    if (!badge) return;

    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  }

  window.setAdminOrdersCount = setAdminOrdersCount;
  window.setMyOrdersCount = setMyOrdersCount;

  /* =====================================================
     🛒 CARRITO
  ===================================================== */
  function updateCartCount() {
    const badge = $("cart-count");
    if (!badge) return;

    try {
      const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
      badge.textContent = cart.reduce((a, i) => a + Number(i.qty || 0), 0);
    } catch {
      badge.textContent = "0";
    }
  }

  function updateHeaderCartTitle() {
    const label = $("count-items");
    if (!label) return;

    try {
      const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
      const total = cart.reduce((a, i) => a + Number(i.qty || 0), 0);
      label.textContent = `Tienes ${total} ${total === 1 ? "café agregado" : "cafés agregados"} a tu pedido`;
    } catch {
      label.textContent = "Tienes 0 cafés agregados a tu pedido";
    }
  }

  /* =====================================================
     PERFIL + ROLES + NOTIFICACIÓN CONTEXTUAL
  ===================================================== */
  function syncUserUI() {
    const user = getUserCache();
    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");
    const notif = $("drawer-notification");

    if (!header || !drawer) return;

    // -----------------------------
    // USUARIO NO LOGUEADO
    // -----------------------------
    if (!user) {
      header.classList.add("no-user");
      header.classList.remove("logged");
      drawer.classList.add("no-user");
      drawer.classList.remove("logged");

      document
        .querySelectorAll(".admin-only,.client-only")
        .forEach(el => el.classList.add("hidden"));

      toggleGlobalNotificationDot(false);
      setAdminOrdersCount(0);
      setMyOrdersCount(0);

      if (notif) notif.classList.add("hidden");
      return;
    }

    // -----------------------------
    // USUARIO LOGUEADO
    // -----------------------------
    header.classList.add("logged");
    header.classList.remove("no-user");
    drawer.classList.add("logged");
    drawer.classList.remove("no-user");

    $("avatar-user") &&
      ($("avatar-user").src = user.photo_url || "/imagenes/avatar-default.svg");
    $("avatar-user-drawer") &&
      ($("avatar-user-drawer").src = user.photo_url || "/imagenes/avatar-default.svg");

    $("drawer-name") && ($("drawer-name").textContent = user.name || "Usuario");
    $("drawer-email") && ($("drawer-email").textContent = user.email || "");

    const isAdmin = user.rol === "admin";

    document.querySelectorAll(".admin-only").forEach(el =>
      el.classList.toggle("hidden", !isAdmin)
    );
    document.querySelectorAll(".client-only").forEach(el =>
      el.classList.toggle("hidden", isAdmin)
    );

    // -----------------------------
    // 🔔 NOTIFICACIÓN CONTEXTUAL
    // -----------------------------
    if (notif) {
      notif.href = isAdmin
        ? "/pages/admin/admin-pedidos.html"
        : "/pages/profile/mis-pedidos.html";

      notif.onclick = () => {
        document.dispatchEvent(
          new CustomEvent("notification:opened", {
            detail: { role: user.rol }
          })
        );
      };
    }
  }

  /* =====================================================
     DRAWER
  ===================================================== */
  function openDrawer() {
    const drawer = $("user-drawer");
    const scrim = $("user-scrim");
    if (!drawer || !scrim) return;

    if (drawer.classList.contains("open")) return;
    drawer.classList.add("open");
    scrim.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    const drawer = $("user-drawer");
    const scrim = $("user-scrim");
    if (!drawer || !scrim) return;

    drawer.classList.remove("open");
    scrim.classList.remove("open");
    document.body.style.overflow = "";
  }

  function toggleDrawer() {
    const drawer = $("user-drawer");
    if (!drawer) return;
    drawer.classList.contains("open") ? closeDrawer() : openDrawer();
  }

  /* =====================================================
     INIT HEADER
  ===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    $("menu-toggle")?.addEventListener("click", toggleDrawer);
    $("btn-header-user")?.addEventListener("click", e => {
      e.stopPropagation();
      toggleDrawer();
    });
    $("user-scrim")?.addEventListener("click", closeDrawer);

    // Cierre automático al pulsar cualquier link del drawer
    $("user-drawer")?.addEventListener("click", (e) => {
      const item = e.target.closest(".user-drawer-item, .user-drawer-profile-link, .drawer-notification");
      if (item) {
        // Un ligero retardo permite que el enlace se procese antes de ocultar
        setTimeout(closeDrawer, 150);
      }
    });

    $("cart-btn")?.addEventListener("click", () => {
      location.href = "/pages/shop/carrito.html";
    });

    $("logout-btn")?.addEventListener("click", async () => {
      if (window.supabaseAuth?.logoutUser) {
        await window.supabaseAuth.logoutUser();
      }
      closeDrawer();
    });

    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();

    requestAnimationFrame(() => {
      if (typeof window.syncNotificationsAll === "function") {
        window.syncNotificationsAll();
      }
    });
  }

  /* =====================================================
     EVENTOS GLOBALES
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    window.addEventListener("cartUpdated", () => {
      updateCartCount();
      updateHeaderCartTitle();
    });

    document.addEventListener("userLoggedIn", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
      document.dispatchEvent(new Event("initNotifications"));
    });

    document.addEventListener("userLoggedOut", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
      toggleGlobalNotificationDot(false);
      setAdminOrdersCount(0);
      setMyOrdersCount(0);
      document.dispatchEvent(new Event("destroyNotifications"));
    });
  }

  window.initHeader = initHeader;
}

/* =====================================================
   LEGACY
===================================================== */
window.syncHeaderCounter = function () {
  window.dispatchEvent(new Event("cartUpdated"));
};
