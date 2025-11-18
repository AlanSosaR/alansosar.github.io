// =============================================
// REGISTRO-CLIENTE.JS — Café Cortero + Supabase
// =============================================
import { registerUser } from "./supabase-auth.js";

// ===============================
// PREVISUALIZAR AVATAR
// ===============================
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

let avatarFileBase64 = null;

if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        avatarFileBase64 = e.target.result;
        avatarPreview.style.backgroundImage = `url('${avatarFileBase64}')`;
      };
      reader.readAsDataURL(file);
    }
  });
}

// ===============================
// SNACKBAR
// ===============================
function snackbar(msg) {
  const bar = document.getElementById("snackbar");
  bar.innerText = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2200);
}

// ===============================
// FORMULARIO
// ===============================
const form = document.getElementById("registroForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre   = document.getElementById("nombreInput").value.trim();
  const correo   = document.getElementById("correoInput").value.trim();
  const telefono = document.getElementById("telefonoInput").value.trim();
  const pais     = document.getElementById("paisInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const confirm  = document.getElementById("confirmPasswordInput").value.trim();

  // Validaciones
  if (!nombre || nombre.length < 3) {
    snackbar("Ingresa un nombre válido.");
    return;
  }

  if (!correo.includes("@")) {
    snackbar("Ingresa un correo electrónico válido.");
    return;
  }

  if (telefono.length < 8) {
    snackbar("Número de teléfono no válido.");
    return;
  }

  if (password.includes(" ")) {
    snackbar("La contraseña no puede contener espacios.");
    return;
  }

  if (password.length < 6) {
    snackbar("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  if (password !== confirm) {
    snackbar("Las contraseñas no coinciden.");
    return;
  }

  // Foto de perfil: la que escogió o la default
  const photoURL = avatarFileBase64 || "/imagenes/avatar-default.svg";

  try {
    // ===============================
    // REGISTRO REAL EN SUPABASE
    // ===============================
    await registerUser(
      correo,
      password,
      telefono,
      nombre,
      pais,
      photoURL
    );

    snackbar("Cuenta creada con éxito ✔️");

    // Reset
    form.reset();
    avatarFileBase64 = null;
    avatarPreview.style.backgroundImage = "url('/imagenes/avatar-default.svg')";

    // Redirigir en 1.5s
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (err) {
    console.error(err);

    if (err.message.includes("already registered")) {
      snackbar("Este correo ya está registrado.");
    } else {
      snackbar("Error al crear la cuenta.");
    }
  }
});
