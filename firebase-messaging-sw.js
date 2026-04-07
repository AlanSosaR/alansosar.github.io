/* =====================================================
   FIREBASE MESSAGING SERVICE WORKER — PRODUCCIÓN
===================================================== */

/* Firebase (compat requerido en SW) */
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

/* =====================================================
   🔑 CONFIG FIREBASE (MISMA QUE firebase.js)
===================================================== */
firebase.initializeApp({
  apiKey: "AIzaSyA5Ba3Qs6cunO8vQUGi1e2AHuTPvozLcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f599c4"
});

/* =====================================================
   INIT MESSAGING
===================================================== */
const messaging = firebase.messaging();

/* =====================================================
   🔔 BACKGROUND PUSH (OBLIGATORIO PARA WEB)
===================================================== */
messaging.onBackgroundMessage(payload => {
  console.log("🔔 Background Msg:", payload);
  const { title, body } = payload.notification || {};
  if (!title) return;

  const options = {
    body: body || payload.data?.message || "",
    icon: "/imagenes/logo.png",
    badge: "/imagenes/icon-192.png",
    data: payload.data,
    requireInteraction: true,
  };

  return self.registration.showNotification(title, options);
});

/* =====================================================
   ⚓ RESPALDO NATIVO (FALLBACK ABSOLUTO)
   Garantiza que el móvil muestre algo aunque el SDK falle
===================================================== */
self.addEventListener("push", event => {
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("⚓ Native push detectado:", payload);

      // Si Firebase ya lo manejó en onBackgroundMessage, lo omitimos
      // Pero si no llegó por ahí (payload.notification vacío), mostramos esto:
      if (payload.notification) return; 

      const title = payload.notification?.title || payload.data?.title || "Café Cortero";
      const options = {
        body: payload.notification?.body || payload.data?.message || payload.data?.body || "Actualización disponible",
        icon: "/imagenes/logo.png",
        badge: "/imagenes/icon-192.png",
        data: payload.data,
        requireInteraction: true
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("🔥 Error en native push handler:", e);
    }
  }
});

/* =====================================================
   CLICK EN NOTIFICACIÓN
===================================================== */
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url =
    event.notification.data?.url ||
    "/pages/home/index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
