// ===============================
// IMPORTAR SUPABASE
// ===============================
import { registerUser } from "./supabase-auth.js";

// ===============================
// PREVISUALIZAR FOTO (funciona 100%)
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
      fotoBase64 = e.target.result;
      avatarPreview.style.backgroundImage = `url('${fotoBase64}')`;
    };
    reader.readAsDataURL(file);
  });
}

// ===============================
// SNACKBAR
// ===============================
function mostrarSnackbar(msg) {
  const bar = document.getElementById("snackbar");
  bar.innerText = msg;
  bar.className = "show";
  setTimeout(() => bar.classList.remove("show"), 2200);
}

// ===============================
// VALIDACIONES ESTILO APPLE
// ===============================
const form = document.getElementById("registroForm");

const nombre = document.getElementById("nombreInput");
const correo = document.getElementById("correoInput");
const telefono = document.getElementById("telefonoInput");
const password = document.getElementById("passwordInput");
const confirm = document.getElementById("confirmPasswordInput");

document.querySelectorAll(".input-group input").forEach((input) => {
  input.dataset.originalPlaceholder = input.placeholder;
});

function marcarError(input, mensaje) {
  const group = input.closest(".input-group");
  group.classList.add("error");
  input.value = "";
  input.placeholder = mensaje;
}

function limpiarError(input) {
  const group = input.closest(".input-group");
  group.classList.remove("error");
  input.placeholder = input.dataset.originalPlaceholder;
}

[nombre, correo, telefono, password, confirm].forEach((input) => {
  input.addEventListener("input", () => limpiarError(input));
});

// ===============================
// FORM SUBMIT
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  limpiarError(nombre);
  limpiarError(correo);
  limpiarError(telefono);
  limpiarError(password);
  limpiarError(confirm);

  if (nombre.value.trim().length < 3) return marcarError(nombre, "Nombre requerido");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo.value.trim())) return marcarError(correo, "Correo inválido");

  const phoneRegex = /^[0-9]{8,15}$/;
  if (!phoneRegex.test(telefono.value.trim())) return marcarError(telefono, "Teléfono inválido");

  if (password.value.length < 6) return marcarError(password, "Mínimo 6 caracteres");

  if (password.value !== confirm.value) return marcarError(confirm, "No coinciden");

  // ================================
  // REGISTRAR EN SUPABASE
  // ================================
  try {
    await registerUser(
      correo.value.trim(),
      password.value.trim(),
      telefono.value.trim(),
      nombre.value.trim(),
      "Honduras",
      fotoBase64 || null
    );

    mostrarSnackbar("Cuenta creada con éxito ✔️");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (error) {
    console.error("Error registro:", error);

    if (error.message.includes("already")) {
      marcarError(correo, "Correo ya registrado");
    } else {
      mostrarSnackbar("No se pudo crear la cuenta");
    }
  }
});
