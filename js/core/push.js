// js/core/push.js
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

const messaging = getMessaging();

// ⚠️ TU VAPID PUBLICA (la que viste en Firebase)
const VAPID_KEY = "BF5zvPxmxyUSFZ1z_XOODlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxUw72c4ZGF7Fa6qW3AviHsOss";

export async function registerPushToken(userId) {
  if (!("Notification" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY
  });

  if (!token) return;

  await supabase
    .from("push_tokens")
    .upsert({
      user_id: userId,
      token,
      platform: "web"
    });

  console.log("🔔 Push token registrado");
}
