import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

console.log("🔥 firebase.js — INIT ÚNICO");

const firebaseConfig = {
  apiKey: "AIzaSyABBa30g6cun08vQUC11e2AHuTPvoZLcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  storageBucket: "cafecortero-eb674.appspot.com",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f899c4"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);
