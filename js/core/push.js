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
   🔔 REGISTER PUSH TOKEN (PRODUCCIÓN)
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

  /* =====================================================
     SERVICE WORKER (REUSO, NO RE-REGISTER)
  ===================================================== */
  let registration = await navigator.serviceWorker.getRegistration(
    "/firebase-messaging-sw.js"
  );

  if (!registration) {
    registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
  }

  // Esperar a que esté activo (CRÍTICO)
  await navigator.serviceWorker.ready;

  /* =====================================================
     TOKEN FCM
  ===================================================== */
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    console.warn("⚠️ Token push no generado");
    return;
  }

  /* =====================================================
     GUARDAR EN SUPABASE
  ===================================================== */
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
