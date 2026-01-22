// js/core/notifications.js
import { registerPushToken } from "./push.js";

console.log("🔔 notifications.js — CORE FINAL");

/* =====================================================
   HELPERS
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
   UI — BADGE GLOBAL (HEADER)
===================================================== */
function toggleGlobalNotificationDot(show) {
  const menuBadge   = document.getElementById("menu-notification-badge");
  const avatarBadge = document.getElementById("avatar-notification-badge");

  [menuBadge, avatarBadge].forEach(badge => {
    if (!badge) return;

    if (show) {
      badge.classList.remove("hidden");
      badge.classList.remove("animate");
      badge.offsetHeight;
      badge.classList.add("animate");
    } else {
      badge.classList.add("hidden");
      badge.classList.remove("animate");
    }
  });
}

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
  document.getElementById("drawer-notification")
    ?.classList.add("hidden");
}

/* =====================================================
   DATA — SYNC
===================================================== */
async function syncNotifications() {
  const user = getUserCache();
  if (!user) {
    hideAllNotificationUI();
    toggleGlobalNotificationDot(false);
    return;
  }

  const sb = await getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    hideAllNotificationUI();
    toggleGlobalNotificationDot(false);
    return;
  }

  const orderNotifs = data.filter(n => n.type === "order");
  if (orderNotifs.length === 0) {
    hideAllNotificationUI();
    toggleGlobalNotificationDot(false);
    return;
  }

  const latest = orderNotifs[0];

  toggleGlobalNotificationDot(true);

  showNotificationUI({
    title: latest.title || "Nuevo pedido",
    message:
      user.rol === "admin"
        ? `Hay ${orderNotifs.length} pedidos pendientes de revisión.`
        : "Tu pedido ha sido actualizado.",
    created_at: latest.created_at,
    role: user.rol
  });
}

/* =====================================================
   REALTIME
===================================================== */
let notificationChannel = null;

async function initRealtime() {
  if (notificationChannel) return;

  const user = getUserCache();
  const sb = await getSupabase();
  if (!user || !sb) return;

  notificationChannel = sb
    .channel(`notifications-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`
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
  const sb = await getSupabase();
  if (!sb || !notificationChannel) return;

  await sb.removeChannel(notificationChannel);
  notificationChannel = null;
}

/* =====================================================
   PUSH — FIREBASE
===================================================== */
async function initPush() {
  const user = getUserCache();
  if (!user) return;

  if (localStorage.getItem("push_registered") === "1") {
    return;
  }

  try {
    await registerPushToken(user.id);
    localStorage.setItem("push_registered", "1");
    console.log("🔔 Push token registrado");
  } catch (err) {
    console.error("❌ Error registrando push:", err);
  }
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
  toggleGlobalNotificationDot(false);
  localStorage.removeItem("push_registered");
  await cleanupRealtime();
});
