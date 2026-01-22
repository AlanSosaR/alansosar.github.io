// js/core/push.js
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { messaging } from "./firebase.js";

console.log("📡 push.js — Firebase Push CORE");

const VAPID_KEY =
  "BF5zvPxmxryUSFZ1z_XO0DlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxkUw72c4ZGF7Fa6qW3AviHsOss";

async function getSupabase() {
  return window.sb || window.supabase || null;
}

export async function registerPushToken(userId) {
  if (!("Notification" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  // Registrar SW (una vez)
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
  if (!sb) throw new Error("Supabase no disponible");

  await sb.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: "web"
    },
    { onConflict: "token" }
  );

  console.log("✅ Push token guardado en Supabase");
}
