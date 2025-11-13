// ===============================
// PREVISUALIZAR AVATAR (alta calidad con background-image)
// ===============================
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        // Cambiar imagen del avatar
        avatarPreview.style.backgroundImage = `url('${e.target.result}')`;
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

  setTimeout(() => {
    bar.className = bar.className.replace("show", "");
  }, 2200);
}

// ===============================
// VALIDACIÓN DEL FORMULARIO
// ===============================
const form = document.getElementById("registroForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombreInput").value.trim();
  const correo = document.getElementById("correoInput").value.trim();
  const telefono = document.getElementById("telefonoInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const confirm = document.getElementById("confirmPasswordInput").value.trim();

  // Sin espacios en contraseña
  if (password.includes(" ")) {
    mostrarSnackbar("La contraseña no puede contener espacios.");
    return;
  }

  if (password !== confirm) {
    mostrarSnackbar("Las contraseñas no coinciden.");
    return;
  }

  if (telefono.length < 8) {
    mostrarSnackbar("Ingresa un número de teléfono válido.");
    return;
  }

  // Aquí conectaremos Firebase (mañana)
  mostrarSnackbar("Cuenta creada con éxito ✔️");

  // Reset visual
  form.reset();
  avatarPreview.style.backgroundImage = "url('imagenes/avatar-default.svg')";
});
