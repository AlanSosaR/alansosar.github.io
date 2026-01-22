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

  // 👉 expuesto para notifications.js
  window.toggleGlobalNotificationDot = toggleGlobalNotificationDot;

  /* =====================================================
     📦 BADGES — PEDIDOS (ADMIN / CLIENTE)
     ⚠️ SOLO UI — NO QUERIES AQUÍ
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

  // 👉 expuestos para orders.js / notifications.js
  window.setAdminOrdersCount = setAdminOrdersCount;
  window.setMyOrdersCount = setMyOrdersCount;

  /* =====================================================
     🛒 CARRITO — CONTADOR
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
      label.textContent = `${total} ${total === 1 ? "café" : "cafés"}`;
    } catch {
      label.textContent = "0 cafés";
    }
  }

  /* =====================================================
     PERFIL + ROLES
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

      document
        .querySelectorAll(".admin-only,.client-only")
        .forEach(el => el.classList.add("hidden"));

      toggleGlobalNotificationDot(false);
      setAdminOrdersCount(0);
      setMyOrdersCount(0);
      return;
    }

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
  }

/* =====================================================
   DRAWER — CONTROL SEGURO + SYNC NOTIFICATIONS
===================================================== */
function openDrawer() {
  const drawer = $("user-drawer");
  const scrim  = $("user-scrim");

  if (!drawer || !scrim) return;

  // Evitar doble apertura
  if (drawer.classList.contains("open")) return;

  drawer.classList.add("open");
  scrim.classList.add("open");
  document.body.style.overflow = "hidden";

  // 🔥 CLAVE: esperar a que el DOM se pinte
  requestAnimationFrame(() => {
    if (typeof window.syncNotificationsAll === "function") {
      window.syncNotificationsAll();
    }
  });
}

function closeDrawer() {
  const drawer = $("user-drawer");
  const scrim  = $("user-scrim");

  if (!drawer || !scrim) return;

  if (!drawer.classList.contains("open")) return;

  drawer.classList.remove("open");
  scrim.classList.remove("open");
  document.body.style.overflow = "";
}

function toggleDrawer() {
  const drawer = $("user-drawer");
  if (!drawer) return;

  drawer.classList.contains("open")
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

  $("menu-toggle")?.addEventListener("click", toggleDrawer);
  $("btn-header-user")?.addEventListener("click", e => {
    e.stopPropagation();
    toggleDrawer();
  });
  $("user-scrim")?.addEventListener("click", closeDrawer);

  $("cart-btn")?.addEventListener("click", () => {
    location.href = "carrito.html";
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

  // 🔥 FORZAR CARGA DEL CONTADOR "MIS PEDIDOS"
  if (typeof window.syncNotificationsAll === "function") {
    window.syncNotificationsAll();
  }
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

      // 🔔 inicializar sistema de notificaciones / pedidos
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
   COMPATIBILIDAD LEGACY
===================================================== */
window.syncHeaderCounter = function () {
  window.dispatchEvent(new Event("cartUpdated"));
};
