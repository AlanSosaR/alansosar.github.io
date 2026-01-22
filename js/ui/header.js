import { registerPushToken } from "./push.js";
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
   🔴 BADGE GLOBAL — AVATAR + HAMBURGUESA (FINAL)
===================================================== */
function toggleGlobalNotificationDot(show) {
  const menuBadge   = document.getElementById("menu-notification-badge");
  const avatarBadge = document.getElementById("avatar-notification-badge");

  [menuBadge, avatarBadge].forEach(badge => {
    if (!badge) return;

    if (show) {
      badge.classList.remove("hidden");

      // 🔑 reinicia la animación correctamente
      badge.classList.remove("animate");
      badge.offsetHeight; // fuerza reflow
      badge.classList.add("animate");

    } else {
      badge.classList.add("hidden");
      badge.classList.remove("animate");
    }
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

    const badge = $("client-orders-count");
    if (badge) badge.textContent = data?.length || 0;
  }

  /* =====================================================
     🔔 ADMIN — CONTADOR DE PEDIDOS
  ===================================================== */
  async function syncAdminOrdersCount() {
    const user = getUserCache();
    if (!user || user.rol !== "admin") return;

    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb.from("orders").select("id");
    const badge = $("admin-orders-count");
    if (badge) badge.textContent = data?.length || 0;
  }

/* =====================================================
   🔴 ADMIN — NOTIFICACIONES NO LEÍDAS (CORREGIDO)
===================================================== */
async function syncAdminNotifications() {
  const user = getUserCache();
  if (!user || user.rol !== "admin") return;

  const sb = await getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from("notifications")
    .select("id")
    .eq("is_read", false); // 🔑 ADMIN VE TODAS LAS PENDIENTES

  if (error) {
    console.error("❌ Error leyendo notificaciones:", error);
    return;
  }

  toggleGlobalNotificationDot((data?.length || 0) > 0);
}

  /* =====================================================
   🔔 NOTIFICACIONES CONTEXTUALES — DRAWER (ADMIN + CLIENTE)
===================================================== */

let notificationChannel = null;

async function syncDrawerNotifications() {
  const user = getUserCache();
  if (!user) {
    hideAllNotificationUI();
    return;
  }

  const sb = await getSupabase();
  if (!sb) return;

  const role = user.rol || "cliente";

  const { data: notifications } = await sb
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (!notifications || notifications.length === 0) {
    hideAllNotificationUI();
    toggleGlobalNotificationDot(false);
    return;
  }

  const orderNotifications = notifications.filter(n => n.type === "order");

  if (orderNotifications.length === 0) {
    hideAllNotificationUI();
    toggleGlobalNotificationDot(false);
    return;
  }

  const latest = orderNotifications[0];
  const count = orderNotifications.length;

  toggleGlobalNotificationDot(true);

  showNotificationUI({
    title: latest.title || "Nuevo pedido",
    message:
      role === "admin"
        ? `Hay ${count} pedidos pendientes de revisión.`
        : "Tu pedido ha sido actualizado.",
    created_at: latest.created_at,
    role
  });
}

/* =====================================================
   REALTIME — NOTIFICACIONES
===================================================== */
async function initNotificationRealtime() {
  if (notificationChannel) return;

  const user = getUserCache();
  const sb = await getSupabase();
  if (!user || !sb) return;

  notificationChannel = sb
    .channel("drawer-notifications-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      () => {
        syncDrawerNotifications();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications" },
      payload => {
        if (payload.new.is_read) {
          hideAllNotificationUI();
          toggleGlobalNotificationDot(false);
        }
      }
    )
    .subscribe();
}
/* =====================================================
   🧹 LIMPIEZA REALTIME — NOTIFICACIONES
===================================================== */
async function cleanupNotificationRealtime() {
  const sb = await getSupabase();
  if (!sb) return;

  try {
    if (notificationChannel) {
      await sb.removeChannel(notificationChannel);
      notificationChannel = null;
      console.log("🧹 Notification realtime limpiado");
    }
  } catch (err) {
    console.warn("⚠️ Error limpiando notification realtime:", err);
  }
}
/* =====================================================
   UI
===================================================== */

function showNotificationUI({ title, message, created_at, role }) {
  const block = document.getElementById("drawer-notification");
  if (!block) return;

  block.classList.remove("hidden");

  document.getElementById("drawer-notification-title").textContent = title;
  document.getElementById("drawer-notification-message").textContent = message;
  document.getElementById("drawer-notification-time").textContent =
    timeAgo(created_at);

  block.href =
    role === "admin"
      ? "/pages/admin/admin-pedidos.html"
      : "/mis-pedidos.html";
}

function hideAllNotificationUI() {
  document.getElementById("drawer-notification")
    ?.classList.add("hidden");
}

/* =====================================================
   MARCAR COMO LEÍDAS
===================================================== */
async function markNotificationsAsRead() {
  const user = getUserCache();
  const sb = await getSupabase();
  if (!user || !sb) return;

  await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  hideAllNotificationUI();
  toggleGlobalNotificationDot(false);
}

/* =====================================================
   UTIL
===================================================== */
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "hace unos segundos";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} días`;
}
/* =====================================================
   🔄 REALTIME — ORDERS + NOTIFICATIONS (CORREGIDO)
===================================================== */
let REALTIME_INIT = false;

async function initRealtime() {
  if (REALTIME_INIT) return;
  REALTIME_INIT = true;

  const user = getUserCache();
  const sb = await getSupabase();
  if (!user || !sb) return;

  /* ================= ORDERS ================= */
  sb.channel("orders-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        if (user.rol === "admin") syncAdminOrdersCount();
        if (user.rol === "cliente") syncClientOrderNotification();
      }
    )
    .subscribe();

  /* ================= NOTIFICATIONS ================= */
  sb.channel("notifications-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      () => {
        if (user.rol === "admin") {
          syncAdminNotifications(); // 🔴 ACTIVA DOT EN TIEMPO REAL
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
      }
      closeDrawer();
    });

 syncUserUI();
updateCartCount();
updateHeaderCartTitle();

syncClientOrderNotification();
syncAdminOrdersCount();
syncAdminNotifications();   // 🔴 badge simple (ya lo tenías)

syncDrawerNotifications();  // 🔔 NUEVO: bloque visual del drawer
initRealtime();             // realtime existente (orders + contadores)
initNotificationRealtime(); // 🔔 NUEVO: realtime de notificaciones
  }

  /* =====================================================
     EVENTOS GLOBALES
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
  window.__HEADER_GLOBAL_EVENTS__ = true;

  /* =========================
     🛒 CARRITO ACTUALIZADO
  ========================= */
  window.addEventListener("cartUpdated", () => {
    updateCartCount();
    updateHeaderCartTitle();
  });

  /* =========================
     🔐 LOGIN DE USUARIO
  ========================= */
document.addEventListener("userLoggedIn", async () => {
  // =========================
  // UI BASE
  // =========================
  syncUserUI();
  updateCartCount();
  updateHeaderCartTitle();

  // =========================
  // CONTADORES
  // =========================
  syncClientOrderNotification();
  syncAdminOrdersCount();
  syncAdminNotifications();

  // =========================
  // REALTIME
  // =========================
  initRealtime();
  initNotificationRealtime();

  // =========================
  // 🔔 PUSH NOTIFICATIONS (FIREBASE)
  // =========================
  const user = getUserCache();
  if (!user) return;

  // 🔑 evita registrar varias veces el mismo token
  if (localStorage.getItem("push_registered") === "1") {
    console.log("🔔 Push token ya registrado");
    return;
  }

  try {
    await registerPushToken(user.id);
    localStorage.setItem("push_registered", "1");
    console.log("🔔 Push token registrado correctamente");
  } catch (err) {
    console.error("❌ Error registrando push token:", err);
  }
});

  /* =========================
     🚪 LOGOUT DE USUARIO
  ========================= */
document.addEventListener("userLoggedOut", async () => {
  // =========================
  // UI BASE
  // =========================
  syncUserUI();
  updateCartCount();
  updateHeaderCartTitle();

  // =========================
  // NOTIFICACIONES UI
  // =========================
  toggleGlobalNotificationDot(false);
  hideAllNotificationUI();

  // =========================
  // PUSH NOTIFICATIONS
  // =========================
  // permite volver a registrar token en el próximo login
  localStorage.removeItem("push_registered");

  // =========================
  // REALTIME (SUPABASE)
  // =========================
  REALTIME_INIT = false;

  try {
    await cleanupNotificationRealtime?.();
  } catch (err) {
    console.warn("⚠️ Error limpiando realtime:", err);
  }
});

window.initHeader = initHeader;


// =====================================================
// COMPATIBILIDAD LEGACY
// =====================================================
window.syncHeaderCounter = function () {
  if (typeof window.initHeader === "function") {
    // actualiza contador de carrito
    const event = new Event("cartUpdated");
    window.dispatchEvent(event);
  }
};
