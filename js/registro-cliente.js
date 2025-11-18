// ===============================
// IMPORTAR SUPABASE
// ===============================
import { registerUser } from "./supabase-auth.js";

// ===============================
// PREVISUALIZAR AVATAR
// ===============================
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
let fotoBase64 = null;

if (avatarInput && avatarPreview) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      fotoBase64 = e.target.result;          // Guardamos la imagen en base64
      avatarPreview.style.backgroundImage = `url('${fotoBase64}')`; // Vista previa
    };
    reader.readAsDataURL(file);
  });
}

// ===============================
// SNACKBAR
// ===============================
function mostrarSnackbar(msg) {
  const bar = document.getElementById("snackbar");
  if (!bar) return;
  bar.innerText = msg;
  bar.className = "show";
  setTimeout(() => {
    bar.className = bar.className.replace("show", "");
  }, 2200);
}

// ===============================
// HELPERS DE VALIDACIÓN ESTILO APPLE
// ===============================
const form = document.getElementById("registroForm");
const nombreInput = document.getElementById("nombreInput");
const correoInput = document.getElementById("correoInput");
const telefonoInput = document.getElementById("telefonoInput");
const passwordInput = document.getElementById("passwordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");

// Guardar placeholders originales
document.querySelectorAll(".input-group input").forEach((input) => {
  input.dataset.originalPlaceholder = input.placeholder;
});

// Marca un campo con error (borde rojo + placeholder rojo)
function marcarError(input, mensaje) {
  const group = input.closest(".input-group");
  if (!group) return;
  group.classList.add("error");
  input.value = "";
  input.placeholder = mensaje;
}

// Limpia el estado de error y restaura placeholder
function limpiarError(input) {
  const group = input.closest(".input-group");
  if (!group) return;
  group.classList.remove("error");
  input.placeholder = input.dataset.originalPlaceholder || "";
}

// Limpiar error al escribir de nuevo
[nombreInput, correoInput, telefonoInput, passwordInput, confirmPasswordInput]
  .forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => limpiarError(input));
  });

// ===============================
// MANEJO DEL FORMULARIO
// ===============================
if (form) {
  // Desactivar validación nativa por si acaso (extra además de novalidate)
  form.setAttribute("novalidate", "true");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpiar errores previos
    limpiarError(nombreInput);
    limpiarError(correoInput);
    limpiarError(telefonoInput);
    limpiarError(passwordInput);
    limpiarError(confirmPasswordInput);

    const nombre = nombreInput.value.trim();
    const correo = correoInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const password = passwordInput.value.trim();
    const confirm = confirmPasswordInput.value.trim();

    // ===========================
    // VALIDACIONES (en el propio campo)
    // ===========================
    if (!nombre || nombre.length < 3) {
      marcarError(nombreInput, "Ingresa tu nombre completo");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      marcarError(correoInput, "Correo electrónico no válido");
      return;
    }

    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(telefono)) {
      marcarError(telefonoInput, "Teléfono no válido");
      return;
    }

    if (password.length < 6) {
      marcarError(passwordInput, "Mínimo 6 caracteres");
      return;
    }

    if (password.includes(" ")) {
      marcarError(passwordInput, "Sin espacios en la contraseña");
      return;
    }

    if (password !== confirm) {
      marcarError(confirmPasswordInput, "Las contraseñas no coinciden");
      return;
    }

    // ===========================
    // REGISTRO EN SUPABASE
    // ===========================
    try {
      await registerUser(
        correo,
        password,
        telefono,
        nombre,
        "Honduras",
        fotoBase64 || null   // si no hay foto, Supabase usará el avatar por defecto
      );

      mostrarSnackbar("Cuenta creada con éxito ✔️");

      // Pequeña pausa y redirigir al login
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

    } catch (error) {
      console.error("Error de registro:", error);

      const message = (error.message || "").toLowerCase();

      if (message.includes("already registered") || message.includes("duplicate")) {
        marcarError(correoInput, "Este correo ya está registrado");
        mostrarSnackbar("El correo ya está registrado");
      } else {
        mostrarSnackbar("No se pudo crear la cuenta");
      }
    }
  });
}
