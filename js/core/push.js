// js/core/push.js
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { messaging } from "./firebase.js";

console.log("📡 push.js — Firebase Push CORE (FINAL)");

/* =====================================================
   🔑 VAPID KEY (PUBLICA)
===================================================== */
const VAPID_KEY =
  "BF5zvPxmxryUSFZ1z_XO0DlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxkUw72c4ZGF7Fa6qW3AviHsOss";

/* =====================================================
   HELPERS
===================================================== */
async function getSupabase() {
  return window.sb || window.supabase || null;
}

/* =====================================================
   🔔 REGISTER PUSH TOKEN (SAFE)
===================================================== */
export async function registerPushToken(userId) {
  if (!("Notification" in window)) {
    console.warn("❌ Navegador sin soporte de notificaciones");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("⚠️ Permiso de notificaciones denegado");
    return;
  }

  // 1️⃣ Registrar Service Worker
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  // 2️⃣ ESPERAR A QUE ESTÉ ACTIVO (CLAVE ABSOLUTA)
  await navigator.serviceWorker.ready;

  // 3️⃣ Obtener token PUSH
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    console.warn("⚠️ Token push no generado");
    return;
  }

  const sb = await getSupabase();
  if (!sb) {
    console.error("❌ Supabase no disponible");
    return;
  }

  await sb.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: "web",
      updated_at: new Date().toISOString()
    },
    { onConflict: "token" }
  );

  console.log("✅ Push token guardado en Supabase");
}
