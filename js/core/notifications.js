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
  "pending",
  "confirmed",
  "preparing",
  "shipped"
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
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .in("type", ["order_status", "admin_alert"]);

  setMyCount(count || 0);
}

/* =====================================================
    WHATSAPP — POLLING GLOBAL (ADMIN)
===================================================== */
const WA_API_URL = "https://cafe-cortero.vercel.app/api/wa-proxy";
const WA_INSTANCE = "CafeCortero";
const WA_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

let waBadgeTimer = null;
let waNotifiedMessages = null;
let waLastSeenTs = 0;

async function checkWhatsAppBadge() {
  try {
    const resp = await fetch(`${WA_API_URL}/chat/findMessages/${WA_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: WA_API_KEY },
      body: JSON.stringify({ page: 1, limit: 5 })
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const records = data?.messages?.records || [];

    let lastTs = waLastSeenTs;
    for (const r of records) {
      const ts = r.messageTimestamp || 0;
      if (ts > lastTs) lastTs = ts;

      const fromMe = r.key?.fromMe;
      if (fromMe !== false) continue;
      if (ts <= waLastSeenTs) continue;

      const msgId = r.key?.id || "";
      if (waNotifiedMessages.has(msgId)) continue;
      waNotifiedMessages.add(msgId);

      const cur = parseInt(localStorage.getItem("wa_notif_count") || "0", 10);
      const n = cur + 1;
      localStorage.setItem("wa_notif_count", String(n));
      if (typeof window.setWaNotifCount === "function") window.setWaNotifCount(n);
    }
    waLastSeenTs = lastTs;
    localStorage.setItem("wa_global_last_seen_ts", String(waLastSeenTs));
  } catch (_) {}
}

function initWhatsAppBadge() {
  if (waBadgeTimer) return;
  waLastSeenTs = Math.max(
    parseInt(localStorage.getItem("wa_global_last_seen_ts") || "0", 10),
    Math.floor(Date.now() / 1000) - 3600
  );
  waNotifiedMessages = new Set();
  waBadgeTimer = setInterval(checkWhatsAppBadge, 15000);
  setTimeout(() => checkWhatsAppBadge(), 3000);
}

/* =====================================================
    NOTIFICACIÓN ACTIVA (SOLO 1)
===================================================== */
async function syncNotificationsUI(sb, authUser, role) {
  let query = sb
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (role === "admin") {
    query = query.or(`user_id.eq.${authUser.id},user_id.is.null`);
  } else {
    query = query
      .eq("user_id", authUser.id)
      .in("type", ["order_status", "admin_alert"]);
  }

  const { data } = await query;

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
async function markNotificationsAsRead(sb, userId, role) {
  try {
    if (role === "admin") {
      await sb
        .from("notifications")
        .update({ is_read: true })
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq("is_read", false);
    } else {
      await sb
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    }

    // UI inmediata
    hideAllNotificationUI();
    setGlobalBadge(false);
    localStorage.setItem("wa_notif_count", "0");
    window.setWaNotifCount?.(0);

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
        filter: role === "admin" ? undefined : `user_id=eq.${authUser.id}`
      },
      (payload) => {
        if (role === "admin") {
          const newNotif = payload.new;
          if (newNotif && (!newNotif.user_id || newNotif.user_id === authUser.id)) {
            syncNotificationsUI(sb, authUser, role);
          }
        } else {
          syncNotificationsUI(sb, authUser, role);
        }
      }
    )
    .subscribe();
}

/* =====================================================
   PUSH
===================================================== */
async function initPush(authUser) {
  try {
    // Forzamos registro para depurar conexión push
    await registerPushToken(authUser.id);
    localStorage.setItem("push_v", "20250407_v_forced");
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
document.addEventListener("notification:opened", async (e) => {
  const sb = getSupabase();
  const cache = getUserCache();
  if (!sb || !cache?.id) return;

  await markNotificationsAsRead(sb, cache.id, cache.rol);
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

  if (role === "admin") {
    initWhatsAppBadge();
  }

  // Auto-marcar como leídas si ya estamos en la página de pedidos o WhatsApp
  const path = window.location.pathname;
  if (path.includes("admin-pedidos") || path.includes("mis-pedidos") || path.includes("admin-whatsapp")) {
    console.log("📖 Auto-marcando notificaciones como leídas por ubicación");
    await markNotificationsAsRead(sb, authUser.id, role);
  }
}
