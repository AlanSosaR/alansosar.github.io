// js/core/notifications.js
import { registerPushToken } from "./push.js";

console.log("🔔 notifications.js — CORE FINAL DEFINITIVO");

/* =====================================================
   HELPERS — SUPABASE / SESIÓN
===================================================== */
function getSupabase() {
  return window.supabase || null;
}

async function waitForSupabaseSession() {
  const sb = getSupabase();
  if (!sb) return null;

  for (let i = 0; i < 15; i++) {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) {
      return data.session.user;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}

/* =====================================================
   HELPERS — CACHE UI (NO SEGURIDAD)
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
   UI — HEADER (HOOKS)
===================================================== */
const setGlobalBadge = show =>
  window.toggleGlobalNotificationDot?.(show);

const setAdminCount = count =>
  window.setAdminOrdersCount?.(count);

const setMyCount = count =>
  window.setMyOrdersCount?.(count);

/* =====================================================
   UI — DRAWER
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
  document.getElementById("drawer-notification")?.classList.add("hidden");
}

/* =====================================================
   ESTADOS
===================================================== */
const ADMIN_ACTIVE_STATUSES = [
  "cash_on_delivery",
  "payment_review"
];

const CLIENT_VISIBLE_STATUSES = [
  "cash_on_delivery",
  "payment_review",
  "confirmed",
  "shipped",
  "delivered"
];

/* =====================================================
   CONTADORES
===================================================== */
async function syncAdminOrdersCount(sb) {
  const { count, error } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ADMIN_ACTIVE_STATUSES);

  if (error) {
    console.error("❌ Admin count:", error);
    setAdminCount(0);
    return;
  }

  setAdminCount(count || 0);
}

async function syncMyOrdersCount(sb, authUser) {
  const { count, error } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", authUser.id)
    .in("status", CLIENT_VISIBLE_STATUSES);

  if (error) {
    console.error("❌ Client count:", error);
    setMyCount(0);
    return;
  }

  setMyCount(count || 0);
}

/* =====================================================
   NOTIFICACIONES UI
===================================================== */
async function syncNotificationsUI(sb, authUser, role) {
  let query = sb
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    query = query.eq("user_id", authUser.id);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    hideAllNotificationUI();
    setGlobalBadge(false);
    return;
  }

  setGlobalBadge(true);

  showNotificationUI({
    title: data[0].title || "Nuevo pedido",
    message:
      role === "admin"
        ? "Tienes pedidos pendientes de revisión."
        : "Tienes pedidos activos.",
    created_at: data[0].created_at,
    role
  });
}

/* =====================================================
   SINCRONIZACIÓN TOTAL (🔥 SEGURA)
===================================================== */
async function syncAll(authUser) {
  const sb = getSupabase();
  const cache = getUserCache();
  if (!sb || !authUser || !cache) return;

  if (cache.rol === "admin") {
    await syncAdminOrdersCount(sb);
    setMyCount(0);
  } else {
    await syncMyOrdersCount(sb, authUser);
    setAdminCount(0);
  }

  await syncNotificationsUI(sb, authUser, cache.rol);
}

// Expuesto para header.js
window.syncNotificationsAll = () => {
  if (window.__AUTH_USER__) {
    syncAll(window.__AUTH_USER__);
  }
};

/* =====================================================
   REALTIME
===================================================== */
let ordersChannel = null;
let notificationChannel = null;

async function initRealtime(sb, authUser, role) {
  if (ordersChannel || notificationChannel) return;

  ordersChannel = sb
    .channel(`orders-${authUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        ...(role !== "admin"
          ? { filter: `user_id=eq.${authUser.id}` }
          : {})
      },
      () => syncAll(authUser)
    )
    .subscribe();

  notificationChannel = sb
    .channel(`notifications-${authUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        ...(role !== "admin"
          ? { filter: `user_id=eq.${authUser.id}` }
          : {})
      },
      () => syncNotificationsUI(sb, authUser, role)
    )
    .subscribe();
}

async function cleanupRealtime() {
  const sb = getSupabase();
  if (!sb) return;

  if (ordersChannel) await sb.removeChannel(ordersChannel);
  if (notificationChannel) await sb.removeChannel(notificationChannel);

  ordersChannel = null;
  notificationChannel = null;
}

/* =====================================================
   PUSH
===================================================== */
async function initPush(authUser) {
  if (localStorage.getItem("push_registered") === "1") return;
  await registerPushToken(authUser.id);
  localStorage.setItem("push_registered", "1");
}

/* =====================================================
   UTIL
===================================================== */
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "hace unos segundos";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
}

/* =====================================================
   INIT GLOBAL
===================================================== */
document.addEventListener("userLoggedIn", async () => {
  console.log("🔔 notifications.js → INIT");

  const sb = getSupabase();
  const authUser = await waitForSupabaseSession();
  const cache = getUserCache();

  if (!sb || !authUser || !cache) {
    console.warn("⚠️ No auth estable");
    return;
  }

  window.__AUTH_USER__ = authUser;

  await syncAll(authUser);
  await initRealtime(sb, authUser, cache.rol);
  await initPush(authUser);
});

/* =====================================================
   DESTROY
===================================================== */
document.addEventListener("destroyNotifications", async () => {
  console.log("🔕 notifications.js → DESTROY");

  hideAllNotificationUI();
  setGlobalBadge(false);
  setAdminCount(0);
  setMyCount(0);

  localStorage.removeItem("push_registered");
  window.__AUTH_USER__ = null;

  await cleanupRealtime();
});
