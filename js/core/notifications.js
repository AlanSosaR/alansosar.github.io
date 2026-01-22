// js/core/notifications.js
import { registerPushToken } from "./push.js";

console.log("🔔 notifications.js — CORE FINAL ESTABLE");

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
   UI — HEADER (FUNCIONES EXPUESTAS)
===================================================== */
function setGlobalBadge(show) {
  if (typeof window.toggleGlobalNotificationDot === "function") {
    window.toggleGlobalNotificationDot(show);
  }
}

function setAdminCount(count) {
  if (typeof window.setAdminOrdersCount === "function") {
    window.setAdminOrdersCount(count);
  }
}

function setMyCount(count) {
  if (typeof window.setMyOrdersCount === "function") {
    window.setMyOrdersCount(count);
  }
}

/* =====================================================
   UI — DRAWER (TARJETA DE NOTIFICACIÓN)
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
  document
    .getElementById("drawer-notification")
    ?.classList.add("hidden");
}

/* =====================================================
   DATA — SINCRONIZAR NOTIFICACIONES + CONTADORES
===================================================== */
async function syncNotifications() {
  const user = getUserCache();

  if (!user) {
    hideAllNotificationUI();
    setGlobalBadge(false);
    setAdminCount(0);
    setMyCount(0);
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
    setAdminCount(0);
    setMyCount(0);
    return;
  }

  const orderNotifs = data.filter(n => n.type === "order");

  if (orderNotifs.length === 0) {
    hideAllNotificationUI();
    setGlobalBadge(false);
    setAdminCount(0);
    setMyCount(0);
    return;
  }

  const total = orderNotifs.length;
  const latest = orderNotifs[0];

  setGlobalBadge(true);

  if (user.rol === "admin") {
    setAdminCount(total);
    setMyCount(0);
  } else {
    setMyCount(total);
    setAdminCount(0);
  }

  showNotificationUI({
    title: latest.title || "Nuevo pedido",
    message:
      user.rol === "admin"
        ? `Hay ${total} pedidos pendientes de revisión.`
        : `Tienes ${total} pedido${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"}.`,
    created_at: latest.created_at,
    role: user.rol
  });
}

/* =====================================================
   REALTIME — SUPABASE
===================================================== */
let notificationChannel = null;

async function initRealtime() {
  if (notificationChannel) return;

  const user = getUserCache();
  const sb = getSupabase();
  if (!user || !sb) return;

  const filter =
    user.rol === "admin"
      ? undefined
      : `user_id=eq.${user.id}`;

  notificationChannel = sb
    .channel(`notifications-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        ...(filter ? { filter } : {})
      },
      () => {
        syncNotifications();
      }
    )
    .subscribe(status => {
      console.log("📡 Notifications realtime:", status);
    });
}

async function cleanupRealtime() {
  const sb = getSupabase();
  if (!sb || !notificationChannel) return;

  await sb.removeChannel(notificationChannel);
  notificationChannel = null;
}

/* =====================================================
   PUSH — FIREBASE (UNA VEZ POR SESIÓN)
===================================================== */
async function initPush() {
  const user = getUserCache();
  if (!user) return;

  if (localStorage.getItem("push_registered") === "1") return;

  try {
    await registerPushToken(user.id);
    localStorage.setItem("push_registered", "1");
    console.log("🔔 Push token registrado");
  } catch (err) {
    console.error("❌ Error registrando push:", err);
  }
}

/* =====================================================
   UTILIDAD — TIEMPO RELATIVO
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
  console.log("🔔 Init notifications");
  await syncNotifications();
  await initRealtime();
  await initPush();
});

document.addEventListener("destroyNotifications", async () => {
  console.log("🔕 Destroy notifications");
  hideAllNotificationUI();
  setGlobalBadge(false);
  setAdminCount(0);
  setMyCount(0);
  localStorage.removeItem("push_registered");
  await cleanupRealtime();
});
