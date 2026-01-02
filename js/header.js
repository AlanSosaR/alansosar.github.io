console.log("🧭 header.js — UI CORE FINAL (AUTH + ADMIN + NOTIFS)");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
===================================================== */
if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     HELPERS — USUARIO CACHE
  ===================================================== */
  function getUserCache() {
    try {
      if (localStorage.getItem("cortero_logged") !== "1") return null;
      return JSON.parse(localStorage.getItem("cortero_user"));
    } catch {
      return null;
    }
  }

  async function getSupabase() {
    return window.sb || window.supabase || null;
  }

  /* =====================================================
     CARRITO — BADGE
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
     PERFIL + ROL (CLIENTE / ADMIN)
  ===================================================== */
  function syncUserUI() {
    const user = getUserCache();
    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");

    if (!header || !drawer) return;

    /* ---------- INVITADO ---------- */
    if (!user) {
      header.classList.add("no-user");
      header.classList.remove("logged");
      drawer.classList.add("no-user");
      drawer.classList.remove("logged");
      return;
    }

    /* ---------- LOGUEADO ---------- */
    header.classList.add("logged");
    header.classList.remove("no-user");
    drawer.classList.add("logged");
    drawer.classList.remove("no-user");

    /* Avatar + textos */
    $("avatar-user") && ($("avatar-user").src = user.photo_url || "/imagenes/avatar-default.svg");
    $("avatar-user-drawer") && ($("avatar-user-drawer").src = user.photo_url || "/imagenes/avatar-default.svg");
    $("drawer-name") && ($("drawer-name").textContent = user.name || "Usuario");
    $("drawer-email") && ($("drawer-email").textContent = user.email || "");

    /* ---------- ADMIN ---------- */
    const isAdmin = user.rol === "admin";
    document.querySelectorAll(".admin-only").forEach(el => {
      el.classList.toggle("hidden", !isAdmin);
    });
  }

  /* =====================================================
     🔔 NOTIFICACIÓN CLIENTE — MIS PEDIDOS
  ===================================================== */
  async function syncClientOrderNotification() {
    const user = getUserCache();
    if (!user || user.rol !== "user") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data, error } = await sb
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .or("client_viewed_at.is.null,updated_at.gt.client_viewed_at");

    if (error) return;

    const item = $("mis-pedidos-item");
    if (!item) return;

    let dot = $("mis-pedidos-dot");

    if (data.length > 0 && !dot) {
      dot = document.createElement("span");
      dot.className = "drawer-dot";
      dot.id = "mis-pedidos-dot";
      item.appendChild(dot);
    }

    if (data.length === 0 && dot) {
      dot.remove();
    }
  }

  /* =====================================================
     🔴 CONTADOR ADMIN — PEDIDOS
  ===================================================== */
  async function syncAdminOrdersCount() {
    const user = getUserCache();
    if (!user || user.rol !== "admin") return;

    const badge = $("admin-orders-count");
    if (!badge) return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data, error } = await sb
      .from("orders")
      .select("id")
      .in("status", ["pending_payment", "payment_review"])
      .or("client_viewed_at.is.null,updated_at.gt.client_viewed_at");

    if (error) return;

    const total = data.length;
    badge.textContent = total;
    badge.style.display = total > 0 ? "inline-flex" : "none";
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

    $("menu-toggle")?.addEventListener("click", toggleDrawer);
    $("user-scrim")?.addEventListener("click", closeDrawer);

    $("cart-btn")?.addEventListener("click", () => {
      location.href = "carrito.html";
    });

    $("logout-btn")?.addEventListener("click", () => {
      if (window.supabaseAuth?.logoutUser) {
        window.supabaseAuth.logoutUser();
      } else if (window.corteroLogout) {
        window.corteroLogout();
      }
    });

    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
    syncClientOrderNotification();
    syncAdminOrdersCount();
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
      syncClientOrderNotification();
      syncAdminOrdersCount();
      closeDrawer();
    });

    document.addEventListener("userLoggedOut", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
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

  /* =====================================================
     HEADER LISTO
  ===================================================== */
  document.addEventListener("header:ready", () => {
    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
    syncClientOrderNotification();
    syncAdminOrdersCount();
  });
}
