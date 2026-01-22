import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

console.log("🔥 firebase.js — INIT ÚNICO");

const firebaseConfig = {
  apiKey: "AIzaSyA5Ba3Qs6cunO8vQUGi1e2AHuTPvozLcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  storageBucket: "cafecortero-eb674.firebasestorage.app",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f599c4"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);
