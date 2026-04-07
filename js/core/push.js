// js/core/push.js
import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

import { messaging } from "./firebase.js";

console.log("📡 push.js — Firebase Push CORE (PROD)");

const VAPID_KEY =
  "BF5zvPxmxryUSFZ1z_XO0DlTuXi76nCpXLskVF22LGAEXCMLJNQAvDdcouhDIxkUw72c4ZGF7Fa6qW3AviHsOss";

// =====================================================
// UTIL — obtener supabase global
// =====================================================
function getSupabase() {
  return window.sb || window.supabase || null;
}

// =====================================================
// CORE — registrar push token (IDEMPOTENTE)
// =====================================================
export async function registerPushToken(userId) {
  console.log("🚀 registerPushToken para:", userId);
  try {
    // -----------------------------
    // Validaciones base
    // -----------------------------
    if (!userId) return;
    if (!("Notification" in window)) return;

    // -----------------------------
    // Bloqueo global (anti INIT duplicado)
    // -----------------------------
    if (window.__PUSH_REGISTERED__) {
      console.log("🔁 Push ya registrado, se omite");
      return;
    }
    window.__PUSH_REGISTERED__ = true;

    // -----------------------------
    // Permisos de notificación (GESTOR DE GESTO REQUERIDO PARA MÓVIL)
    // -----------------------------
    if (Notification.permission === "denied") return;

    if (Notification.permission !== "granted") {
      console.log("👆 Esperando gesto del usuario para pedir permisos de notificación");
      const ask = async () => {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          window.__PUSH_REGISTERED__ = false; // Reset para re-intentar registro con permiso
          registerPushToken(userId);
        }
        document.removeEventListener("click", ask);
        document.removeEventListener("touchstart", ask);
      };
      document.addEventListener("click", ask);
      document.addEventListener("touchstart", ask);
      return;
    }

    // -----------------------------
    // Service Worker — limpiar registros viejos y registrar el correcto
    // -----------------------------
    const SW_SCRIPT = "/firebase-messaging-sw.js";

    // Obtener todos los SWs registrados y desregistrar los que no sean el nuestro
    const allRegistrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of allRegistrations) {
      const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
      if (scriptUrl && !scriptUrl.includes("firebase-messaging-sw.js")) {
        console.log("🧹 Desregistrando SW obsoleto:", scriptUrl);
        await reg.unregister();
      }
    }

    // Registrar de forma estable (sin cache-bust que cause re-registros persistentes)
    const swUrl = SW_SCRIPT;
    const registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    await navigator.serviceWorker.ready;

    // -----------------------------
    // Obtener token FCM
    // -----------------------------
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.warn("⚠️ No se pudo obtener token FCM");
      return;
    }

    console.log("🔑 Token FCM generado:", token.substring(0, 30) + "...");

    // -----------------------------
    // Supabase
    // -----------------------------
    const sb = getSupabase();
    if (!sb) {
      console.error("❌ Supabase no disponible");
      return;
    }

    // -----------------------------
    // UPSERT alineado a constraint REAL
    // UNIQUE (user_id, platform)
    // -----------------------------
    const { error } = await sb
      .from("push_tokens")
      .upsert(
        {
          token,
          user_id: userId,
          platform: "web"
        },
        {
          onConflict: "user_id,platform"
        }
      );

    if (error) {
      console.error("❌ Error guardando push token:", error);
      return;
    }

    console.log("✅ Push token guardado en Supabase para user_id:", userId);
  } catch (err) {
    console.error("🔥 Error crítico en registerPushToken:", err);
  }
}

// =====================================================
// 🔔 FOREGROUND PUSH (WEB ABIERTA)
// =====================================================
// ⚠️ ESTE BLOQUE ES EL QUE TE FALTABA
// ⚠️ NO VA EN notifications.js
// ⚠️ NO VA EN EL SERVICE WORKER
// =====================================================
onMessage(messaging, payload => {
  console.log("📩 Push recibido en foreground:", payload);

  // Seguridad básica
  if (!payload?.notification) {
    console.warn("⚠️ Push sin notification payload");
    return;
  }
  if (Notification.permission !== "granted") {
    console.warn("⚠️ Permisos de notificación no otorgados");
    return;
  }

  console.log("🔔 Mostrando notificación:", payload.notification.title);

  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/imagenes/logo.png",
    data: payload.data || {}
  });
});
