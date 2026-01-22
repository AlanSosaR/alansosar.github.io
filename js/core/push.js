// js/core/push.js
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { messaging } from "./firebase.js";

console.log("📡 push.js — Firebase Push CORE (PROD)");

const VAPID_KEY =
  "BF5zvPxmxryUSFZ1z_XO0DlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxkUw72c4ZGF7Fa6qW3AviHsOss";

function getSupabase() {
  return window.sb || window.supabase || null;
}

export async function registerPushToken(userId) {
  if (!userId) return;
  if (!("Notification" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  let registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
  }

  await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) return;

  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from("push_tokens")
    .upsert(
      {
        token,          // 🔑 CLAVE ÚNICA REAL
        user_id: userId,
        platform: "web"
      },
      {
        onConflict: "token" // 🔥 CORRECTO
      }
    );

  if (error) {
    console.error("❌ Error guardando push token:", error);
  } else {
    console.log("✅ Push token registrado / reasignado correctamente");
  }
}
