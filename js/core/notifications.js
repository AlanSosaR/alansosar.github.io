// =====================================================
// NOTIFICATIONS — CORE FINAL DEFINITIVO (PASIVO)
// =====================================================

import { registerPushToken } from "./push.js";

let initialized = false;
let ordersChannel = null;
let notificationChannel = null;
let retryTimer = null;
let retryCount = 0;
const MAX_RETRIES = 10;

console.log("🔔 notifications.js cargado (pasivo)");

/* =====================================================
   HELPERS — SUPABASE
===================================================== */
function getSupabase() {
  return window.supabase || null;
}

/* =====================================================
   CACHE UI (NO SEGURIDAD)
   🔑 FUENTE ÚNICA: cortero_user
===================================================== */
function getUserCache() {
  try {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* =====================================================
   UI — HEADER HOOKS
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

  const { data } = await query;

  if (!data?.length) {
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
   SINCRONIZACIÓN TOTAL
===================================================== */
async function syncAll(sb, authUser, role) {
  if (role === "admin") {
    await syncAdminOrdersCount(sb);
    setMyCount(0);
  } else {
    await syncMyOrdersCount(sb, authUser.id);
    setAdminCount(0);
  }

  await syncNotificationsUI(sb, authUser, role);
}

/* =====================================================
   REALTIME
===================================================== */
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
      () => syncAll(sb, authUser, role)
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
   🔔 API PÚBLICA (ÚNICA)
===================================================== */
export async function initNotifications() {
  if (initialized) {
    console.warn("🔁 notifications.js ya inicializado, se omite");
    return;
  }

  const sb = getSupabase();
  if (!sb) return;

  // 🔑 FUENTE REAL DE AUTH
  const { data } = await sb.auth.getSession();
  const authUser = data?.session?.user;
  const cache = getUserCache();

  if (!authUser || !cache) {
    if (retryCount >= MAX_RETRIES) {
      console.error("❌ Notificaciones: estado inválido permanente", {
        supabase: !!sb,
        authUser: !!authUser,
        cache: !!cache
      });
      return;
    }

    retryCount++;
    retryTimer = setTimeout(initNotifications, 300);
    return;
  }

  initialized = true;

  console.log("🔔 notifications.js → INIT (Supabase OK)");

  await syncAll(sb, authUser, cache.rol);
  await initRealtime(sb, authUser, cache.rol);
  await initPush(authUser);
}
