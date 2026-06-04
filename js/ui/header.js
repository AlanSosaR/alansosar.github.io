console.log("🧭 header.js — UI CORE LIMPIO (CON HOOKS COMPLETOS)");

import { initNotifications } from "../core/notifications.js";

if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     PWA — CONTROL DE INSTALACIÓN
  ===================================================== */
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log("PWA: Evento beforeinstallprompt capturado");
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById("pwa-install-btn");
    if (installBtn) {
      installBtn.classList.remove("hidden");
    }
  });

  window.addEventListener('appinstalled', (evt) => {
    console.log('PWA: Aplicación instalada exitosamente');
    const installBtn = document.getElementById("pwa-install-btn");
    if (installBtn) {
      installBtn.classList.add("hidden");
    }
  });

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
     💬 BADGE — WHATSAPP
  ===================================================== */
  function setWaNotifCount(count) {
    const badge = $("wa-notif-count");
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  }

  window.setWaNotifCount = setWaNotifCount;

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

      document.querySelectorAll(".logged").forEach(el => el.classList.add("hidden"));
      document.querySelectorAll(".no-user").forEach(el => el.classList.remove("hidden"));

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

    document.querySelectorAll(".logged").forEach(el => el.classList.remove("hidden"));
    document.querySelectorAll(".no-user").forEach(el => el.classList.add("hidden"));

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

    // Botón de instalación PWA
    const installBtn = $("pwa-install-btn");
    if (installBtn) {
      if (deferredPrompt) {
        installBtn.classList.remove("hidden");
      }
      installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: Respuesta del usuario para instalar la app: ${outcome}`);
        if (outcome === 'accepted') {
          installBtn.classList.add("hidden");
        }
        deferredPrompt = null;
      });
    }

    // Cierre automático al pulsar cualquier link del drawer + limpiar notificaciones
    $("user-drawer")?.addEventListener("click", (e) => {
      const item = e.target.closest(".user-drawer-item, .user-drawer-profile-link, .drawer-notification");
      if (item) {
        const href = item.getAttribute("href") || "";
        if (href.includes("admin-whatsapp") || href.includes("admin-pedidos") || href.includes("mis-pedidos")) {
          localStorage.setItem("wa_notif_count", "0");
          setWaNotifCount(0);
          document.dispatchEvent(new CustomEvent("notification:opened"));
        }
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

    // Leer badge de WhatsApp desde localStorage (lo escribe admin-whatsapp.js)
    const saved = parseInt(localStorage.getItem("wa_notif_count") || "0", 10);
    if (saved > 0) setWaNotifCount(saved);

    // Polling periódico del badge WhatsApp desde localStorage
    if (!window.__WA_BADGE_POLL__) {
      window.__WA_BADGE_POLL__ = true;
      setInterval(() => {
        const v = parseInt(localStorage.getItem("wa_notif_count") || "0", 10);
        if (v > 0) {
          setWaNotifCount(v);
          toggleGlobalNotificationDot(true);
        } else {
          setWaNotifCount(0);
        }
      }, 5000);
    }

    requestAnimationFrame(() => {
      initNotifications();
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
      initNotifications();
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
