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
// SNACKBAR NOTIFICACIONES — custom M3
// =====================================================
function injectNotificationStyles() {
  if (document.getElementById("push-snackbar-style")) return;
  const style = document.createElement("style");
  style.id = "push-snackbar-style";
  style.textContent = `
    #push-snackbar {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translate(-50%, 18px);
      max-width: 520px;
      width: calc(100% - 56px);
      padding: 14px 18px;
      border-radius: 18px;
      background: rgba(20, 22, 24, 0.94);
      color: #fff;
      font-size: 14.5px;
      line-height: 1.35;
      box-shadow: 0 18px 44px rgba(0,0,0,.55), 0 6px 16px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 14px;
      opacity: 0;
      pointer-events: none;
      z-index: 999999;
      transition: opacity .22s ease, transform .22s cubic-bezier(.2,0,0,1);
    }
    #push-snackbar::before {
      content: "";
      width: 6px;
      align-self: stretch;
      border-radius: 999px;
      background: #33c26b;
      opacity: .95;
      flex-shrink: 0;
    }
    #push-snackbar.show {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0);
    }
    #push-snackbar .push-msg {
      flex: 1 1 auto;
      min-width: 0;
      font-weight: 500;
    }
    #push-snackbar .push-actions {
      display: flex;
      gap: 8px;
      flex: 0 0 auto;
    }
    #push-snackbar .push-btn {
      border: 0;
      font: inherit;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 8px 18px;
      border-radius: 999px;
      cursor: pointer;
      transition: background .18s ease, transform .15s ease;
    }
    #push-snackbar .push-btn:active {
      transform: scale(0.95);
    }
    #push-snackbar .push-btn-allow {
      background: #fff;
      color: #1b5e20;
    }
    #push-snackbar .push-btn-allow:hover {
      background: #f0f0f0;
    }
    #push-snackbar .push-btn-later {
      background: transparent;
      color: rgba(255,255,255,.85);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
    }
    #push-snackbar .push-btn-later:hover {
      background: rgba(255,255,255,.10);
    }
    @media (max-width: 600px) {
      #push-snackbar {
        bottom: 16px;
        width: calc(100% - 32px);
        padding: 14px 16px;
        border-radius: 16px;
        font-size: 14px;
      }
      #push-snackbar .push-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `;
  document.head.appendChild(style);
}

function mostrarSnackbarNotificaciones(userId) {
  if (localStorage.getItem("notifications_dismissed") === "true") return;
  if (Notification.permission !== "default") return;

  injectNotificationStyles();

  let el = document.getElementById("push-snackbar");
  if (!el) {
    el = document.createElement("div");
    el.id = "push-snackbar";
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <span class="push-msg">¿Permitir notificaciones para estar al día con tus pedidos?</span>
    <span class="push-actions">
      <button class="push-btn push-btn-later" id="push-btn-later">Ahora no</button>
      <button class="push-btn push-btn-allow" id="push-btn-allow">Permitir</button>
    </span>
  `;

  document.getElementById("push-btn-allow").onclick = async () => {
    el.classList.remove("show");
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      window.__PUSH_REGISTERED__ = false;
      registerPushToken(userId);
    }
  };

  document.getElementById("push-btn-later").onclick = () => {
    el.classList.remove("show");
    localStorage.setItem("notifications_dismissed", "true");
  };

  requestAnimationFrame(() => el.classList.add("show"));
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
    // Permisos de notificación — SNACKBAR PERSONALIZADO
    // Solo mostrar si:
    //   1. El permiso está en estado "default" (el usuario nunca decidió)
    //   2. No ha descartado el snackbar antes (localStorage)
    //   3. El usuario está logueado (userId)
    // -----------------------------
    if (Notification.permission === "denied") {
      console.log("🔕 Notificaciones denegadas por el usuario");
      return;
    }

    if (Notification.permission === "granted") {
      console.log("✅ Notificaciones ya aceptadas — registrando push directamente");
      // Continuar normalmente con el registro del SW + token
    } else if (Notification.permission === "default") {
      console.log("👆 Notificaciones sin decidir — mostrando snackbar");
      mostrarSnackbarNotificaciones(userId);
      return; // Esperar decisión del usuario
    } else {
      return; // Caso raro (shouldn't happen)
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
  if (!payload?.notification) return;
  document.dispatchEvent(new CustomEvent("push:foreground", { detail: payload }));
});
