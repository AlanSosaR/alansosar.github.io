// ===========================
// LOGIN.JS – Café Cortero ☕
// ===========================

// Referencias a los campos
const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");

// Guardar placeholders originales
document.querySelectorAll(".input-group input").forEach(input => {
  input.dataset.originalPlaceholder = input.placeholder;
});

// Función para marcar error visual inline
function marcarError(input, mensaje) {
  const group = input.parentElement;
  group.classList.add("error");
  input.value = "";
  input.placeholder = mensaje;
}

// Función para limpiar el error
function limpiarError(input) {
  const group = input.parentElement;
  group.classList.remove("error");
  input.placeholder = input.dataset.originalPlaceholder;
}

// Detectar origen del login (desde carrito o menú)
const params = new URLSearchParams(window.location.search);
const from = params.get("from");

// Escuchar el envío del formulario
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Limpiar errores anteriores
  limpiarError(userInput);
  limpiarError(passInput);

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  // ====== Validaciones Inline ======
  if (!userValue) {
    marcarError(userInput, "Ingresa tu correo o teléfono");
    return;
  }

  if (userValue.includes("@")) {
    // Validar correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userValue)) {
      marcarError(userInput, "Correo no válido");
      return;
    }
  } else {
    // Validar teléfono
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(userValue)) {
      marcarError(userInput, "Teléfono no válido");
      return;
    }
  }

  if (!passValue) {
    marcarError(passInput, "Ingresa tu contraseña");
    return;
  }

  // ====== Lógica de autenticación Firebase ======
  try {
    // Detectar si el usuario usa correo o teléfono
    if (userValue.includes("@")) {
      // Login con correo
      const { getAuth, signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, userValue, passValue);
    } else {
      // (Opción futura: autenticación con teléfono)
      console.warn("Login con teléfono aún no implementado en Firebase.");
      marcarError(userInput, "Login con teléfono aún no disponible");
      return;
    }

    // ====== Login exitoso ======
    mostrarSnackbar("Inicio de sesión exitoso ☕ Bienvenido a Café Cortero");

    setTimeout(() => {
      if (from === "carrito") {
        window.location.href = "detalles-cliente.html";
      } else {
        window.location.href = "index.html";
      }
    }, 2000);

  } catch (error) {
    console.error("Error en inicio de sesión:", error.message);

    if (error.code === "auth/user-not-found") {
      marcarError(userInput, "Usuario no registrado");
    } else if (error.code === "auth/wrong-password") {
      marcarError(passInput, "Contraseña incorrecta");
    } else {
      marcarError(userInput, "Error al iniciar sesión");
    }
  }
});
