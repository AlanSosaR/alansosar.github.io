// js/core/push.js

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getMessaging,
  getToken
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

console.log("📡 push.js — Firebase Push CORE (FINAL)");

/* =====================================================
   🔑 FIREBASE CONFIG (WEB)
===================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyA5B3a30g6cun08vQUGl1o2AHuTPvoZLcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f899c4"
};

/* =====================================================
   🔑 VAPID KEY (PUBLICA)
===================================================== */
const VAPID_KEY =
  "BF5zvPxmxryUSFZ1z_XO0DlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxkUw72c4ZGF7Fa6qW3AviHsOss";

/* =====================================================
   INIT FIREBASE
===================================================== */
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/* =====================================================
   HELPERS
===================================================== */
async function getSupabase() {
  return window.sb || window.supabase || null;
}

/* =====================================================
   🔔 REGISTER PUSH TOKEN
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

  // Registrar Service Worker (una sola vez)
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

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

  await sb
    .from("push_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform: "web"
      },
      { onConflict: "token" }
    );

  console.log("✅ Push token guardado en Supabase");
}
