/* =====================================================
   FIREBASE MESSAGING SERVICE WORKER — PRODUCCIÓN
===================================================== */

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyA5Ba3Qs6cunO8vQUGi1e2AHuTPvozLcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f599c4"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

console.log("🚀 Service Worker: Inicializado con Config v2");

// Manejo de mensajes en segundo plano (FCM Directo)
messaging.onBackgroundMessage((payload) => {
  console.log("🔔 Msg Segundo Plano:", payload);
  
  const title = payload.notification?.title || "Café Cortero";
  const options = {
    body: payload.notification?.body || payload.data?.message || "Tienes una nueva actualización",
    icon: "/imagenes/logo.png",
    badge: "/imagenes/icon-192.png",
    data: payload.data,
    tag: "order-status", // Agrupa notificaciones
    renotify: true,
    requireInteraction: true
  };

  return self.registration.showNotification(title, options);
});

// Manejo nativo ante cualquier evento 'push' (Fallback total)
self.addEventListener("push", (event) => {
  console.log("⚓ Evento Push Nativo detectado");
  if (!event.data) return;

  try {
    const payload = event.data.json();
    console.log("⚓ Datos Push:", payload);

    // Evitar duplicados si Firebase ya lo manejó
    if (payload.notification) return;

    const title = payload.data?.title || "Café Cortero";
    const options = {
      body: payload.data?.message || "Actualización de pedido",
      icon: "/imagenes/logo.png",
      badge: "/imagenes/icon-192.png",
      tag: "order-status",
      requireInteraction: true
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("🔥 Error manejando push nativo:", err);
  }
});

// Click en la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || "/pages/profile/mis-pedidos.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
