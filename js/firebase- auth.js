// ==============================
// 🔥 AUTENTICACIÓN FIREBASE v11
// ==============================

// Importar la configuración base de tu proyecto
import { app } from "./firebase-config.js";

// Importar los módulos necesarios desde Firebase v11
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Inicializar autenticación
const auth = getAuth(app);

// ==============================
// 📧 REGISTRO E INICIO CON CORREO
// ==============================

// Registrar usuario con correo y contraseña
export async function registrarConCorreo(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    alert("Cuenta creada con éxito. Bienvenido a Café Cortero ☕");
    return userCredential.user;
  } catch (error) {
    alert("Error al crear la cuenta: " + error.message);
    console.error(error);
  }
}

// Iniciar sesión con correo y contraseña
export async function loginConCorreo(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    alert("Inicio de sesión exitoso ☕");
    window.location.href = "index.html"; // Redirigir al inicio
    return userCredential.user;
  } catch (error) {
    alert("Error al iniciar sesión: " + error.message);
    console.error(error);
  }
}

// ==============================
// 🔁 RECUPERAR CONTRASEÑA
// ==============================

export async function recuperarConCorreo(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu correo 📩");
  } catch (error) {
    alert("Error al enviar el enlace: " + error.message);
    console.error(error);
  }
}

// ==============================
// 📱 LOGIN CON TELÉFONO (modo prueba)
// ==============================

// Inicializar reCAPTCHA invisible
export function configurarRecaptcha() {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: (response) => {
      console.log("reCAPTCHA verificado correctamente");
    }
  });
}

// Enviar código SMS
export async function enviarCodigoTelefono(numeroTelefono) {
  try {
    configurarRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(auth, numeroTelefono, appVerifier);
    window.confirmationResult = confirmationResult;
    alert("Código enviado (modo prueba). Usa el código configurado en Firebase.");
  } catch (error) {
    alert("Error al enviar código: " + error.message);
    console.error(error);
  }
}

// Verificar código SMS
export async function verificarCodigo(codigo) {
  try {
    const result = await window.confirmationResult.confirm(codigo);
    alert("Inicio de sesión con teléfono exitoso ☕");
    window.location.href = "index.html";
    return result.user;
  } catch (error) {
    alert("Error al verificar el código: " + error.message);
    console.error(error);
  }
}

// ==============================
// 🚪 CERRAR SESIÓN
// ==============================

export async function cerrarSesion() {
  try {
    await signOut(auth);
    alert("Sesión cerrada correctamente");
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
  }
}

// ==============================
// 👤 DETECTAR USUARIO ACTIVO
// ==============================

onAuthStateChanged(auth, (user) => {
  const loginItem = document.getElementById("loginItem");
  const misPedidosItem = document.getElementById("misPedidosItem");

  if (user) {
    console.log("Usuario activo:", user.email || user.phoneNumber);

    // Mostrar "Mis pedidos"
    if (misPedidosItem) misPedidosItem.style.display = "block";

    // Cambiar el texto del menú a "Cerrar sesión"
    if (loginItem) {
      loginItem.innerHTML = '<a href="#" id="logoutLink">Cerrar sesión</a>';
      document.getElementById("logoutLink").addEventListener("click", cerrarSesion);
    }

  } else {
    console.log("Ningún usuario activo.");

    // Ocultar "Mis pedidos"
    if (misPedidosItem) misPedidosItem.style.display = "none";

    // Mostrar "Iniciar sesión"
    if (loginItem) loginItem.innerHTML = '<a href="login.html">Iniciar sesión</a>';
  }
});
