// js/core/notifications.js
import { registerPushToken } from "./push.js";

console.log("🔔 notifications.js — CORE FINAL CORREGIDO");

/* =====================================================
   HELPERS — USUARIO / SUPABASE
===================================================== */
function getUserCache() {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

function getSupabase() {
  return window.sb || window.supabase || null;
}

/* =====================================================
   UI — HEADER (HOOKS)
===================================================== */
function setGlobalBadge(show) {
  window.toggleGlobalNotificationDot?.(show);
}

function setAdminCount(count) {
  window.setAdminOrdersCount?.(count);
}

function setMyCount(count) {
  window.setMyOrdersCount?.(count);
}

/* =====================================================
   UI — DRAWER (NOTIFICACIÓN SUPERIOR)
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
   CONTADORES REALES — PEDIDOS (🔥 CLAVE)
===================================================== */
const ACTIVE_STATUSES = ["cash_on_delivery", "payment_review"];

/* ADMIN */
async function syncAdminOrdersCount() {
  const sb = getSupabase();
  if (!sb) return;

  const { count, error } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ACTIVE_STATUSES);

  if (error) {
    console.error("❌ Error contando pedidos admin:", error);
    setAdminCount(0);
    return;
  }

  setAdminCount(count || 0);
}

/* CLIENTE */
async function syncMyOrdersCount(userId) {
  const sb = getSupabase();
  if (!sb) return;

  const { count, error } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES);

  if (error) {
    console.error("❌ Error contando pedidos cliente:", error);
    setMyCount(0);
    return;
  }

  setMyCount(count || 0);
}

/* =====================================================
   NOTIFICACIONES (CAMPANA + TARJETA)
===================================================== */
async function syncNotificationsUI() {
  const user = getUserCache();
  if (!user) {
    hideAllNotificationUI();
    setGlobalBadge(false);
    return;
  }

  const sb = getSupabase();
  if (!sb) return;

  let query = sb
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (user.rol !== "admin") {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    hideAllNotificationUI();
    setGlobalBadge(false);
    return;
  }

  const latest = data[0];
  setGlobalBadge(true);

  showNotificationUI({
    title: latest.title || "Nuevo pedido",
    message:
      user.rol === "admin"
        ? "Tienes pedidos pendientes de revisión."
        : "Tienes pedidos activos.",
    created_at: latest.created_at,
    role: user.rol
  });
}

/* =====================================================
   SINCRONIZACIÓN TOTAL (🔥 USADA POR HEADER)
===================================================== */
async function syncAll() {
  const user = getUserCache();
  if (!user) return;

  if (user.rol === "admin") {
    await syncAdminOrdersCount();
    setMyCount(0);
  } else {
    await syncMyOrdersCount(user.id);
    setAdminCount(0);
  }

  await syncNotificationsUI();
}

// 👉 usado por header.js al abrir drawer
window.syncNotificationsAll = syncAll;

/* =====================================================
   REALTIME — SUPABASE
===================================================== */
let notificationChannel = null;
let ordersChannel = null;

async function initRealtime() {
  if (notificationChannel || ordersChannel) return;

  const user = getUserCache();
  const sb = getSupabase();
  if (!user || !sb) return;

  notificationChannel = sb
    .channel(`notifications-${user.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      () => syncNotificationsUI()
    )
    .subscribe();

  ordersChannel = sb
    .channel(`orders-${user.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => syncAll()
    )
    .subscribe();
}

async function cleanupRealtime() {
  const sb = getSupabase();
  if (!sb) return;

  if (notificationChannel) await sb.removeChannel(notificationChannel);
  if (ordersChannel) await sb.removeChannel(ordersChannel);

  notificationChannel = null;
  ordersChannel = null;
}

/* =====================================================
   PUSH — FIREBASE
===================================================== */
async function initPush() {
  const user = getUserCache();
  if (!user) return;

  if (localStorage.getItem("push_registered") === "1") return;

  await registerPushToken(user.id);
  localStorage.setItem("push_registered", "1");
}

/* =====================================================
   UTILIDAD
===================================================== */
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "hace unos segundos";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} días`;
}

/* =====================================================
   EVENTOS DESDE HEADER
===================================================== */
document.addEventListener("initNotifications", async () => {
  await syncAll();        // 🔥 inicial inmediato
  await initRealtime();
  await initPush();
});

document.addEventListener("destroyNotifications", async () => {
  hideAllNotificationUI();
  setGlobalBadge(false);
  setAdminCount(0);
  setMyCount(0);
  localStorage.removeItem("push_registered");
  await cleanupRealtime();
});
