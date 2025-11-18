// ===============================
// IMPORTAR SUPABASE
// ===============================
import { registerUser } from "./supabase-auth.js";

// ===============================
// CAMPOS DEL FORM
// ===============================
const form = document.getElementById("registroForm");

// Campos
const nombreInput = document.getElementById("nombreInput");
const correoInput = document.getElementById("correoInput");
const telefonoInput = document.getElementById("telefonoInput");
const passwordInput = document.getElementById("passwordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");

// Avatar
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
let fotoBase64 = null;

// ===============================
// PREVISUALIZAR AVATAR (CORREGIDO)
// ===============================
avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;

  // Validaciones estilo Apple
  if (!file.type.startsWith("image/")) {
    mostrarError(avatarInput, "Selecciona una imagen válida.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    mostrarError(avatarInput, "La imagen debe ser menor de 2 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    fotoBase64 = e.target.result;

    avatarPreview.style.backgroundImage = `url('${fotoBase64}')`;
    avatarPreview.style.backgroundSize = "cover";
    avatarPreview.style.backgroundPosition = "center center";
  };
  reader.readAsDataURL(file);
});

// ===============================
// VALIDACIONES TIPO APPLE
// ===============================

// Remueve mensajes existentes
function limpiarErrores() {
  document.querySelectorAll(".input-error-msg").forEach((el) => el.remove());
  document.querySelectorAll(".input-error").forEach((el) =>
    el.classList.remove("input-error")
  );
}

// Muestra error debajo del input
function mostrarError(input, mensaje) {
  input.classList.add("input-error");

  // Si ya existe un mensaje, no duplicar
  if (input.parentElement.querySelector(".input-error-msg")) return;

  const msg = document.createElement("small");
  msg.className = "input-error-msg";
  msg.innerText = mensaje;

  input.parentElement.appendChild(msg);
}

// ===============================
// ENVIAR FORMULARIO
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarErrores();

  const nombre = nombreInput.value.trim();
  const correo = correoInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  // ===========================
  // VALIDACIONES APPLE-LIKE
  // ===========================
  let valido = true;

  if (nombre.length < 3) {
    mostrarError(nombreInput, "Ingresa tu nombre completo.");
    valido = false;
  }

  if (!correo.includes("@") || correo.length < 6) {
    mostrarError(correoInput, "Ingresa un correo válido.");
    valido = false;
  }

  if (telefono.length < 8) {
    mostrarError(telefonoInput, "Número de teléfono inválido.");
    valido = false;
  }

  if (password.length < 6) {
    mostrarError(passwordInput, "Mínimo 6 caracteres.");
    valido = false;
  }

  if (password !== confirmPassword) {
    mostrarError(confirmPasswordInput, "Las contraseñas no coinciden.");
    valido = false;
  }

  if (!valido) return;

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
      fotoBase64 || null
    );

    // Animación rápida tipo Apple
    form.classList.add("form-success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);

  } catch (error) {
    mostrarError(correoInput, "El correo ya está registrado.");
    console.error(error);
  }
});
