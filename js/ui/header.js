console.log("🧭 header.js — UI CORE FINAL (AUTH + ADMIN + NOTIFS + REALTIME)");

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
     🔴 DOT GLOBAL (AVATAR + HAMBURGUESA)
     ⚠️ usa .notification-dot (CSS real)
  ===================================================== */
  function toggleGlobalNotificationDot(show) {
    const targets = ["avatar-user", "menu-toggle"];

    targets.forEach(id => {
      const el = $(id);
      if (!el) return;

      let dot = el.querySelector(".notification-dot");

      if (show && !dot) {
        dot = document.createElement("span");
        dot.className = "notification-dot";
        el.style.position = "relative";
        el.appendChild(dot);
      }

      if (!show && dot) dot.remove();
    });
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
     PERFIL + ROL
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

      document.querySelectorAll(".admin-only,.client-only").forEach(el =>
        el.classList.add("hidden")
      );

      toggleGlobalNotificationDot(false);
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
    $("drawer-name") &&
      ($("drawer-name").textContent = user.name || "Usuario");
    $("drawer-email") &&
      ($("drawer-email").textContent = user.email || "");

    const isAdmin = user.rol === "admin";
    document.querySelectorAll(".admin-only").forEach(el =>
      el.classList.toggle("hidden", !isAdmin)
    );
    document.querySelectorAll(".client-only").forEach(el =>
      el.classList.toggle("hidden", isAdmin)
    );
  }

  /* =====================================================
     🔔 CLIENTE — NOTIFICACIONES + CONTADOR
     ✔ NO al crear pedido
     ✔ SOLO cuando admin cambia estado
  ===================================================== */
  async function syncClientOrderNotification() {
    const user = getUserCache();
    if (!user || user.rol !== "cliente") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .or("client_viewed_at.is.null,updated_at.gt.client_viewed_at");

    const pendingUpdates = data?.length || 0;

    // 🔢 contador TOTAL de pedidos (no notificación)
    const { data: allOrders } = await sb
      .from("orders")
      .select("id")
      .eq("user_id", user.id);

    const totalOrders = allOrders?.length || 0;

    const badge = $("client-orders-count");
    if (badge) badge.textContent = totalOrders;

    // 🔴 notificación SOLO si hay cambios del admin
    toggleGlobalNotificationDot(pendingUpdates > 0);

    const item = $("mis-pedidos-item");
    if (item) {
      let dot = item.querySelector(".drawer-dot");
      if (pendingUpdates > 0 && !dot) {
        dot = document.createElement("span");
        dot.className = "drawer-dot";
        item.appendChild(dot);
      }
      if (pendingUpdates === 0 && dot) dot.remove();
    }
  }

  /* =====================================================
     🔴 ADMIN — CONTADOR DE PEDIDOS
  ===================================================== */
  async function syncAdminOrdersCount() {
    const user = getUserCache();
    if (!user || user.rol !== "admin") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("orders")
      .select("id")
      .in("status", ["pending_payment", "payment_review"]);

    const total = data?.length || 0;

    const badge = $("admin-orders-count");
    if (badge) badge.textContent = total;

    toggleGlobalNotificationDot(total > 0);
  }

  /* =====================================================
     🔄 REALTIME — ORDERS
  ===================================================== */
  async function initOrdersRealtime() {
    const user = getUserCache();
    const sb = await getSupabase();
    if (!user || !sb) return;

    sb.channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        payload => {
          if (user.rol === "admin") syncAdminOrdersCount();
          if (user.rol === "cliente" && payload.new?.user_id === user.id) {
            syncClientOrderNotification();
          }
        }
      )
      .subscribe();
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
      } else if (window.corteroLogout) {
        await window.corteroLogout();
      }
      closeDrawer();
    });

    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
    syncClientOrderNotification();
    syncAdminOrdersCount();
    initOrdersRealtime();
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
      initOrdersRealtime();
      closeDrawer();
    });

    document.addEventListener("userLoggedOut", () => {
      syncUserUI();
      updateCartCount();
      updateHeaderCartTitle();
      toggleGlobalNotificationDot(false);
      closeDrawer();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  window.initHeader = initHeader;
}
