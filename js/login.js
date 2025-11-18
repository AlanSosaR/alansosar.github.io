// ===========================
// LOGIN.JS – Café Cortero ☕
// Supabase versión premium
// ===========================

// Inicializar Supabase
const supabase = window.supabaseClient;

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

// ===============================
// MANEJO DEL FORMULARIO
// ===============================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Limpiar errores anteriores
  limpiarError(userInput);
  limpiarError(passInput);

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  // ====== VALIDACIONES ======
  if (!userValue) {
    marcarError(userInput, "Ingresa tu correo o teléfono");
    return;
  }

  if (userValue.includes("@")) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userValue)) {
      marcarError(userInput, "Correo no válido");
      return;
    }
  } else {
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

  // ===========================
  // LOGIN CON SUPABASE
  // ===========================
  try {
    let emailToUse = userValue;

    // Si es teléfono, lo convertimos a correo virtual
    if (!userValue.includes("@")) {
      emailToUse = `${userValue}@cortero.hn`; 
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passValue
    });

    if (error) {
      console.error("Supabase login error:", error);
      
      if (error.message.includes("Invalid login credentials")) {
        marcarError(passInput, "Credenciales incorrectas");
      } else {
        marcarError(userInput, "Error al iniciar sesión");
      }
      return;
    }

    // ===========================
    // LOGIN EXITOSO
    // ===========================
    mostrarSnackbar("Inicio de sesión exitoso ☕ Bienvenido a Café Cortero");

    setTimeout(() => {
      if (from === "carrito") {
        window.location.href = "detalles-cliente.html";
      } else {
        window.location.href = "index.html";
      }
    }, 1500);

  } catch (err) {
    console.error("Error inesperado:", err);
    marcarError(userInput, "Error al iniciar sesión");
  }
});
