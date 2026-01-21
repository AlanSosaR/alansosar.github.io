console.log("🧭 header.js — UI CORE FINAL (AUTH + ADMIN + NOTIFS + REALTIME)");

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

  async function getSupabase() {
    return window.sb || window.supabase || null;
  }

  /* =====================================================
     🔴 DOT GLOBAL (AVATAR + HAMBURGUESA)
  ===================================================== */
  function toggleGlobalNotificationDot(show) {
    ["avatar-user", "menu-toggle"].forEach(id => {
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
     🔔 CLIENTE — PEDIDOS
  ===================================================== */
  async function syncClientOrderNotification() {
    const user = getUserCache();
    if (!user || user.rol !== "cliente") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("orders")
      .select("id")
      .eq("user_id", user.id);

    $("client-orders-count") &&
      ($("client-orders-count").textContent = data?.length || 0);
  }

  /* =====================================================
     🔔 ADMIN — PEDIDOS
  ===================================================== */
  async function syncAdminOrdersCount() {
    const user = getUserCache();
    if (!user || user.rol !== "admin") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb.from("orders").select("id");
    $("admin-orders-count") &&
      ($("admin-orders-count").textContent = data?.length || 0);
  }

  /* =====================================================
     🔴 ADMIN — NOTIFICACIONES
  ===================================================== */
  async function syncAdminNotifications() {
    const user = getUserCache();
    if (!user || user.rol !== "admin") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_read", false);

    toggleGlobalNotificationDot((data?.length || 0) > 0);
  }

  /* =====================================================
     🔄 REALTIME
  ===================================================== */
  let REALTIME_INIT = false;

  async function initRealtime() {
    if (REALTIME_INIT) return;
    REALTIME_INIT = true;

    const user = getUserCache();
    const sb = await getSupabase();
    if (!user || !sb) return;

    sb.channel("orders-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (user.rol === "admin") syncAdminOrdersCount();
          if (user.rol === "cliente") syncClientOrderNotification();
        }
      ).subscribe();

    sb.channel("notifications-realtime")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        payload => {
          if (user.rol === "admin" && payload.new.user_id === user.id) {
            syncAdminNotifications();
          }
        }
      ).subscribe();
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
     INIT HEADER (EXTERNO)
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
    syncClientOrderNotification();
    syncAdminOrdersCount();
    syncAdminNotifications();
    initRealtime();
  }

  window.initHeader = initHeader;
}
