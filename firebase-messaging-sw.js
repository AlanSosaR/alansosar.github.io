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
  apiKey: "AIzaSyA5B3a30g6cun08vQUGl1o2AHuTPvoZLcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f899c4"
});

/* =====================================================
   INIT MESSAGING
===================================================== */
const messaging = firebase.messaging();

/* =====================================================
   🔔 BACKGROUND PUSH (OBLIGATORIO PARA WEB)
===================================================== */
messaging.onBackgroundMessage(payload => {
  console.log("🔔 Background push recibido:", payload);

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Café Cortero";

  const options = {
    body:
      payload.notification?.body ||
      payload.data?.message ||
      "Tienes una nueva notificación",
    icon: "/imagenes/logo.png",
    badge: "/imagenes/logo.png",
    data: payload.data || {},
    requireInteraction: true
  };

  self.registration.showNotification(title, options);
});

/* =====================================================
   CLICK EN NOTIFICACIÓN
===================================================== */
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url =
    event.notification.data?.url ||
    "/";

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
