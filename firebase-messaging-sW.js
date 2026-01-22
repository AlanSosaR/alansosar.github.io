importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "TU_API_KEY_FIREBASE",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:XXXXXXX"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  console.log("🔔 Background message:", payload);

  self.registration.showNotification(
    payload.notification?.title || "Café Cortero",
    {
      body: payload.notification?.body || "Tienes una nueva notificación",
      icon: "/imagenes/logo.png"
    }
  );
});
