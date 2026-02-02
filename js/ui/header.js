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

    [menuBadge, avatarBadge].forEach((badge) => {
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
      label.textContent = `${total} ${total === 1 ? "café" : "cafés"}`;
    } catch {
      label.textContent = "0 cafés";
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

    if (!user) {
      header.classList.add("no-user");
      header.classList.remove("logged");
      drawer.classList.add("no-user");
      drawer.classList.remove("logged");

      document
        .querySelectorAll(".admin-only,.client-only")
        .forEach((el) => el.classList.add("hidden"));

      toggleGlobalNotificationDot(false);
      setAdminOrdersCount(0);
      setMyOrdersCount(0);

      notif && notif.classList.add("hidden");
      setupHeaderSearch();
      setupDrawerFilters();
      return;
    }

    header.classList.add("logged");
    header.classList.remove("no-user");
    drawer.classList.add("logged");
    drawer.classList.remove("no-user");

    $("avatar-user") &&
      ($("avatar-user").src =
        user.photo_url || "/imagenes/avatar-default.svg");
    $("avatar-user-drawer") &&
      ($("avatar-user-drawer").src =
        user.photo_url || "/imagenes/avatar-default.svg");

    $("drawer-name") &&
      ($("drawer-name").textContent = user.name || "Usuario");
    $("drawer-email") &&
      ($("drawer-email").textContent = user.email || "");

    const isAdmin = user.rol === "admin";

    document
      .querySelectorAll(".admin-only")
      .forEach((el) => el.classList.toggle("hidden", !isAdmin));
    document
      .querySelectorAll(".client-only")
      .forEach((el) => el.classList.toggle("hidden", isAdmin));

    if (notif) {
      notif.classList.remove("hidden");
      notif.href = isAdmin
        ? "/pages/admin/admin-pedidos.html"
        : "/pages/profile/mis-pedidos.html";
    }

    setupHeaderSearch();
    setupDrawerFilters();
  }

  /* =====================================================
     🔍 DRAWER FILTERS
  ===================================================== */
  function setupDrawerFilters() {
    const filterSection = $("drawer-filters-section");
    const container = $("drawer-filters-container");
    const headerFilter = $("header-status-filter");

    if (!filterSection || !container || !headerFilter) {
      filterSection && filterSection.classList.add("hidden");
      return;
    }

    const isVisible = !headerFilter.classList.contains("hidden");
    filterSection.classList.toggle("hidden", !isVisible);
    if (!isVisible) return;

    container.innerHTML = "";

    const mobileFilter = headerFilter.cloneNode(true);
    mobileFilter.id = "drawer-status-filter";
    mobileFilter.classList.remove("hidden");

    mobileFilter.onchange = (e) => {
      headerFilter.value = e.target.value;
      document.dispatchEvent(
        new CustomEvent("header:filter", { detail: e.target.value })
      );
    };

    container.appendChild(mobileFilter);
  }

  /* =====================================================
     🔍 BÚSQUEDA ADAPTATIVA (HEADER)
  ===================================================== */
  function setupHeaderSearch() {
    const searchWrap = $("header-search-container");
    const searchInput = $("header-search-input");
    const statusFilter = $("header-status-filter");
    const addBtn = $("header-add-btn");
    const staticTitles = $("header-static-titles");

    const path = window.location.pathname;
    const isMainAdmin = path.includes("admin-productos.html");
    const isOrdersAdmin = path.includes("admin-pedidos.html");
    const isMyOrders = path.includes("mis-pedidos.html");
    const shouldShowSearch = isMainAdmin || isOrdersAdmin || isMyOrders;

    if (!searchWrap || !searchInput) {
      staticTitles && staticTitles.classList.remove("hidden");
      return;
    }

    searchWrap.classList.toggle("hidden", !shouldShowSearch);
    staticTitles &&
      staticTitles.classList.toggle("hidden", shouldShowSearch);
    statusFilter && statusFilter.classList.add("hidden");
    addBtn && addBtn.classList.add("hidden");

    if (!shouldShowSearch) return;

    if (isMainAdmin) {
      searchInput.placeholder = "Buscar café…";
      addBtn && addBtn.classList.remove("hidden");
    } else {
      searchInput.placeholder = "Buscar pedido…";
      statusFilter && statusFilter.classList.remove("hidden");
      statusFilter &&
        (statusFilter.value = isOrdersAdmin ? "new" : "all");
    }

    searchInput.oninput = (e) => {
      document.dispatchEvent(
        new CustomEvent("header:search", { detail: e.target.value })
      );
    };

    statusFilter &&
      (statusFilter.onchange = (e) => {
        document.dispatchEvent(
          new CustomEvent("header:filter", { detail: e.target.value })
        );
      });

    addBtn &&
      (addBtn.onclick = () => {
        document.dispatchEvent(new CustomEvent("header:add-click"));
      });
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

    const btnMenu = $("menu-toggle");
    btnMenu &&
      btnMenu.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDrawer();
      });

    const avatarBtn = document.querySelector(
      "#btn-header-user .header-avatar-button"
    );
    avatarBtn &&
      avatarBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDrawer();
      });

    const btnCart = $("cart-btn");
    btnCart &&
      btnCart.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = "/pages/shop/carrito.html";
      });

    const scrim = $("user-scrim");
    scrim &&
      scrim.addEventListener("click", (e) => {
        e.preventDefault();
        closeDrawer();
      });

    const logoutBtn = $("logout-btn");
    logoutBtn &&
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
          }
        } finally {
          closeDrawer();
          window.location.href = "/pages/home/index.html";
        }
      });

    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
  }
// 🔥 FIX DEFINITIVO — HITBOX HEADER
document.querySelectorAll(
  '.header-search-wrap, .header-titles-wrap'
).forEach(el => {
  if (getComputedStyle(el).display === 'none') {
    el.remove();
  }
});
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
    });

    document.addEventListener("userLoggedOut", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
      toggleGlobalNotificationDot(false);
      setAdminOrdersCount(0);
      setMyOrdersCount(0);
    });
  }

  window.initHeader = initHeader;

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(initHeader, 10);
  } else {
    document.addEventListener("DOMContentLoaded", initHeader);
  }

  /* =====================================================
     LEGACY (NO TOCAR)
  ===================================================== */
  window.syncHeaderCounter = function () {
    window.dispatchEvent(new Event("cartUpdated"));
  };

  window.syncHeaderUser = function () {
    syncUserUI();
  };
}
