// js/core/push.js
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { messaging } from "./firebase.js";

console.log("📡 push.js — Firebase Push CORE (PROD)");

const VAPID_KEY =
  "BF5zvPxmxryUSFZ1z_XO0DlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxkUw72c4ZGF7Fa6qW3AviHsOss";

/* =====================================================
   HELPERS
===================================================== */
function getSupabase() {
  return window.sb || window.supabase || null;
}

/* =====================================================
   REGISTER PUSH TOKEN
===================================================== */
export async function registerPushToken(userId) {
  if (!userId) {
    console.warn("❌ userId requerido para registrar push");
    return;
  }

  if (!("Notification" in window)) {
    console.warn("❌ Navegador sin soporte de notificaciones");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("⚠️ Permiso de notificaciones denegado");
    return;
  }

  /* ================= SERVICE WORKER ================= */
  let registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
  }

  await navigator.serviceWorker.ready;

  /* ================= TOKEN ================= */
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    console.warn("⚠️ Token push no generado");
    return;
  }

  /* ================= SUPABASE ================= */
  const sb = getSupabase();
  if (!sb) {
    console.error("❌ Supabase no disponible");
    return;
  }

  const { error } = await sb
    .from("push_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform: "web",
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id,platform"
      }
    );

  if (error) {
    console.error("❌ Error guardando push token:", error);
  } else {
    console.log("✅ Push token guardado REALMENTE en Supabase");
  }
}
