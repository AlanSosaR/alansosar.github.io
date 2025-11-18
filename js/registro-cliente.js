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

if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        fotoBase64 = e.target.result; // Guardar para enviar a Supabase
        avatarPreview.style.backgroundImage = `url('${fotoBase64}')`;
      };
      reader.readAsDataURL(file);
    }
  });
}

// ===============================
// SNACKBAR
// ===============================
function mostrarSnackbar(msg) {
  const bar = document.getElementById("snackbar");
  bar.innerText = msg;
  bar.className = "show";
  setTimeout(() => bar.className = bar.className.replace("show", ""), 2200);
}

// ===============================
// FORMULARIO
// ===============================
const form = document.getElementById("registroForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombreInput").value.trim();
  const correo = document.getElementById("correoInput").value.trim();
  const telefono = document.getElementById("telefonoInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const confirm = document.getElementById("confirmPasswordInput").value.trim();

  // ===========================
  // VALIDACIONES
  // ===========================

  if (!nombre || nombre.length < 3) {
    mostrarSnackbar("Ingresa un nombre válido.");
    return;
  }

  if (!correo.includes("@")) {
    mostrarSnackbar("Ingresa un correo válido.");
    return;
  }

  if (telefono.length < 8) {
    mostrarSnackbar("Ingresa un número de teléfono válido.");
    return;
  }

  if (password.includes(" ")) {
    mostrarSnackbar("La contraseña no puede tener espacios.");
    return;
  }

  if (password !== confirm) {
    mostrarSnackbar("Las contraseñas no coinciden.");
    return;
  }

  // ===========================
  // REGISTRO EN SUPABASE
  // ===========================
  try {
    const { user } = await registerUser(
      correo,
      password,
      telefono,
      nombre,
      "Honduras",
      fotoBase64 || null
    );

    mostrarSnackbar("Cuenta creada con éxito ✔️");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (error) {
    console.error("Error de registro:", error);

    if (error.message.includes("already registered")) {
      mostrarSnackbar("El correo ya está registrado");
    } else {
      mostrarSnackbar("No se pudo crear la cuenta");
    }
  }
});
