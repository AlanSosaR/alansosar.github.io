// Importar funciones principales de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Configuración de tu aplicación web (de tu captura)
const firebaseConfig = {
  apiKey: "AIzaSyA5Ba3Qs6cunO8vQU1ie2AHuTPvozlcI4",
  authDomain: "cafecortero-eb674.firebaseapp.com",
  projectId: "cafecortero-eb674",
  storageBucket: "cafecortero-eb674.firebasestorage.app",
  messagingSenderId: "412829554061",
  appId: "1:412829554061:web:61a29b4f59881858f599c4"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
