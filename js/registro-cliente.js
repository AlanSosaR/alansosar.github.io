import { registerUser } from "./supabase-auth.js";

/* ===============================
   AVATAR PREVIEW
   =============================== */
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
let fotoBase64 = null;

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    fotoBase64 = e.target.result;
    avatarPreview.style.backgroundImage = `url('${fotoBase64}')`;
  };
  reader.readAsDataURL(file);
});

/* ===============================
   SNACKBAR
   =============================== */
function snackbar(msg) {
  const bar = document.getElementById("snackbar");
  bar.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2000);
}

/* ===============================
   VALIDACIÓN ESTILO APPLE
   =============================== */
const form = document.getElementById("registroForm");

const nombre = document.getElementById("nombreInput");
const correo = document.getElementById("correoInput");
const telefono = document.getElementById("telefonoInput");
const password = document.getElementById("passwordInput");
const confirm = document.getElementById("confirmPasswordInput");

document.querySelectorAll(".input-group input").forEach(input => {
  input.dataset.original = input.placeholder;
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
  input.placeholder = input.dataset.original;
}

[nombre, correo, telefono, password, confirm].forEach(input => {
  input.addEventListener("input", () => limpiarError(input));
});

/* ===============================
   SUBMIT
   =============================== */
form.addEventListener("submit", async e => {
  e.preventDefault();

  limpiarError(nombre);
  limpiarError(correo);
  limpiarError(telefono);
  limpiarError(password);
  limpiarError(confirm);

  if (nombre.value.trim().length < 3)
    return marcarError(nombre, "Ingresa tu nombre");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo.value.trim()))
    return marcarError(correo, "Correo inválido");

  const phoneRegex = /^[0-9]{8,15}$/;
  if (!phoneRegex.test(telefono.value.trim()))
    return marcarError(telefono, "Teléfono inválido");

  if (password.value.length < 6)
    return marcarError(password, "Mínimo 6 caracteres");

  if (password.value !== confirm.value)
    return marcarError(confirm, "No coinciden");

  try {
    await registerUser(
      correo.value.trim(),
      password.value.trim(),
      telefono.value.trim(),
      nombre.value.trim(),
      "Honduras",
      fotoBase64
    );

    snackbar("Cuenta creada ✔");
    setTimeout(() => window.location.href = "login.html", 1300);

  } catch (err) {
    console.error(err);
    snackbar("No se pudo crear la cuenta");

    if (err.message && err.message.includes("duplicate")) {
      marcarError(correo, "Correo ya registrado");
    }
  }
});
