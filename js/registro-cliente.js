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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      fotoBase64 = e.target.result; // guardamos la imagen
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

  setTimeout(() => {
    bar.classList.remove("show");
  }, 2200);
}

// ===============================
// VALIDACIÓN DEL FORMULARIO
// ===============================
const form = document.getElementById("registroForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombreInput").value.trim();
  const correo = document.getElementById("correoInput").value.trim();
  const telefono = document.getElementById("telefonoInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const confirm = document.getElementById("confirmPasswordInput").value.trim();

  // Validaciones básicas
  if (!nombre) {
    mostrarSnackbar("Ingresa tu nombre completo");
    return;
  }

  if (!correo.includes("@")) {
    mostrarSnackbar("Ingresa un correo válido");
    return;
  }

  if (telefono.length < 8) {
    mostrarSnackbar("Ingresa un número de teléfono válido");
    return;
  }

  if (password.includes(" ")) {
    mostrarSnackbar("La contraseña no puede contener espacios");
    return;
  }

  if (password.length < 6) {
    mostrarSnackbar("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  if (password !== confirm) {
    mostrarSnackbar("Las contraseñas no coinciden");
    return;
  }

  // ===============================
  // REGISTRAR EN SUPABASE
  // ===============================
  try {
    await registerUser(
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

  } catch (err) {
    console.error("SUPABASE ERROR:", err);

    if (err.message.includes("already")) {
      mostrarSnackbar("Este correo ya está registrado");
    } else {
      mostrarSnackbar("No se pudo crear la cuenta");
    }
  }
});
