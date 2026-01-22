/* =====================================================
   FIREBASE MESSAGING SERVICE WORKER
===================================================== */

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
   🔔 BACKGROUND PUSH
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
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});
