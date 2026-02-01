// =====================================================
// NOTIFICATIONS — CORE FINAL DEFINITIVO (PASIVO / PROD)
// =====================================================

import { registerPushToken } from "./push.js";

let initialized = false;
let ordersChannel = null;
let notificationChannel = null;
let retryCount = 0;
const MAX_RETRIES = 10;

console.log("🔔 notifications.js cargado (pasivo)");

/* =====================================================
   HELPERS — SUPABASE
===================================================== */
function getSupabase() {
  return window.supabaseClient || window.supabase || null;
}

/* =====================================================
   CACHE — USUARIO
===================================================== */
function getUserCache() {
  try {
    const raw = localStorage.getItem("cortero_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* =====================================================
   UI — HOOKS HEADER (PASIVOS)
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
      : "/pages/profile/mis-pedidos.html";
}

function hideAllNotificationUI() {
  document.getElementById("drawer-notification")?.classList.add("hidden");
}

/* =====================================================
   STATUS
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
  const { count } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ADMIN_ACTIVE_STATUSES);

  setAdminCount(count || 0);
}

async function syncMyOrdersCount(sb, userId) {
  const { count } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", CLIENT_VISIBLE_STATUSES);

  setMyCount(count || 0);
}

/* =====================================================
   NOTIFICACIÓN ACTIVA (SOLO 1)
===================================================== */
async function syncNotificationsUI(sb, authUser, role) {
  const { data } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data?.length) {
    hideAllNotificationUI();
    setGlobalBadge(false);
    return;
  }

  setGlobalBadge(true);

  showNotificationUI({
    title: data[0].title || "Nueva notificación",
    message:
      role === "admin"
        ? "Tienes pedidos pendientes de revisión."
        : "Tienes pedidos activos.",
    created_at: data[0].created_at,
    role
  });
}

/* =====================================================
   MARCAR COMO LEÍDAS (CLICK)
===================================================== */
async function markNotificationsAsRead(sb, userId) {
  try {
    await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    // UI inmediata
    hideAllNotificationUI();
    setGlobalBadge(false);
    setAdminCount(0);
    setMyCount(0);

    console.log("✅ Notificaciones marcadas como leídas");
  } catch (err) {
    console.warn("⚠️ Error marcando notificaciones:", err);
  }
}

/* =====================================================
   SINCRONIZACIÓN TOTAL
===================================================== */
async function syncAll(sb, authUser, role) {
  try {
    if (role === "admin") {
      await syncAdminOrdersCount(sb);
      setMyCount(0);
    } else {
      await syncMyOrdersCount(sb, authUser.id);
      setAdminCount(0);
    }

    await syncNotificationsUI(sb, authUser, role);
  } catch (err) {
    console.warn("⚠️ syncAll falló:", err);
  }
}

/* =====================================================
   REALTIME
===================================================== */
async function initRealtime(sb, authUser, role) {
  if (ordersChannel || notificationChannel) return;

  ordersChannel = sb
    .channel("orders-global")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => syncAll(sb, authUser, role)
    )
    .subscribe();

  notificationChannel = sb
    .channel("notifications-user")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${authUser.id}`
      },
      () => syncNotificationsUI(sb, authUser, role)
    )
    .subscribe();
}

/* =====================================================
   PUSH
===================================================== */
async function initPush(authUser) {
  if (localStorage.getItem("push_registered") === "1") return;

  try {
    await registerPushToken(authUser.id);
    localStorage.setItem("push_registered", "1");
  } catch (err) {
    console.warn("⚠️ Push init falló:", err);
  }
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
   EVENTO: NOTIFICACIÓN ABIERTA
===================================================== */
document.addEventListener("notification:opened", async () => {
  const sb = getSupabase();
  const cache = getUserCache();
  if (!sb || !cache?.id) return;

  await markNotificationsAsRead(sb, cache.id);
});

/* =====================================================
   API PÚBLICA
===================================================== */
export async function initNotifications() {
  if (initialized) return;

  const sb = getSupabase();
  const cache = getUserCache();

  if (!sb || !cache?.id || !cache?.rol) {
    if (++retryCount <= MAX_RETRIES) {
      setTimeout(initNotifications, 300);
    }
    return;
  }

  initialized = true;

  const authUser = { id: cache.id };
  const role = cache.rol;

  console.log("🔔 notifications INIT OK", { user: authUser.id, role });

  await syncAll(sb, authUser, role);
  await initRealtime(sb, authUser, role);
  await initPush(authUser);
}
