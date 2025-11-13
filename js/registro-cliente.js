// -------------------------------------------------------
// AVATAR PREVIEW (Foto de perfil)
// -------------------------------------------------------
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.querySelector(".avatar-preview");

avatarInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    avatarPreview.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// -------------------------------------------------------
// SNACKBAR
// -------------------------------------------------------
function showSnackbar(message) {
  const snackbar = document.getElementById("snackbar");
  snackbar.textContent = message;
  snackbar.className = "show";

  setTimeout(() => {
    snackbar.className = snackbar.className.replace("show", "");
  }, 2800);
}

// -------------------------------------------------------
// VALIDACIONES
// -------------------------------------------------------
function validarNombre(nombre) {
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{3,50}$/.test(nombre);
}

function validarCorreo(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function validarTelefono(tel) {
  return /^[0-9]{8,15}$/.test(tel);
}

function validarPassword(pass) {
  // Sin espacios, mínimo 6
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/.test(pass);
}

// -------------------------------------------------------
// FORMULARIO DE REGISTRO
// -------------------------------------------------------
const form = document.getElementById("registroForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  // 🛑 Validaciones completas
  if (!validarNombre(nombre)) {
    showSnackbar("Escribe un nombre válido (solo letras).");
    return;
  }

  if (!validarCorreo(correo)) {
    showSnackbar("Correo electrónico inválido.");
    return;
  }

  if (!validarTelefono(telefono)) {
    showSnackbar("Número de teléfono inválido.");
    return;
  }

  if (!validarPassword(password)) {
    showSnackbar("La contraseña debe tener mínimo 6 caracteres sin espacios, con letras y números.");
    return;
  }

  if (password !== confirmPassword) {
    showSnackbar("Las contraseñas no coinciden.");
    return;
  }

  // Obtiene avatar BASE64 (si el usuario seleccionó)
  let avatarBase64 = null;

  if (avatarInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = function (event) {
      avatarBase64 = event.target.result;
      continuarRegistro();
    };
    reader.readAsDataURL(avatarInput.files[0]);
  } else {
    continuarRegistro();
  }

  // -------------------------------------------------------
  // FUNCIÓN FINAL
  // -------------------------------------------------------
  function continuarRegistro() {
    const usuario = {
      nombre,
      correo,
      telefono,
      avatar: avatarBase64 || "imagenes/avatar-default.svg",
      fechaRegistro: new Date().toISOString(),
    };

    console.log("📌 Datos listos para enviar a Firebase:", usuario);

    showSnackbar("Cuenta creada correctamente.");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1400);
  }
});
