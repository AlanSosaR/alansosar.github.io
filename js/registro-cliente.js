import { registerUser } from "./supabase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     AVATAR PREVIEW
  ================================= */
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  let fotoBase64 = null;

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

  /* ===============================
     VALIDACIONES
  ================================= */

  // Validación profesional de correo
  function esCorreoValido(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  const form = document.getElementById("registroForm");

  const campos = {
    nombre: document.getElementById("nombreInput"),
    correo: document.getElementById("correoInput"),
    telefono: document.getElementById("telefonoInput"),
    password: document.getElementById("passwordInput"),
    confirm: document.getElementById("confirmPasswordInput"),
  };

  const errores = {
    nombre: document.getElementById("errorNombre"),
    correo: document.getElementById("errorCorreo"),
    telefono: document.getElementById("errorTelefono"),
    password: document.getElementById("errorPassword"),
    confirm: document.getElementById("errorConfirm"),
  };

  function limpiarErrores() {
    Object.values(errores).forEach((e) => e.textContent = "");
    document.querySelectorAll(".input-group").forEach(g =>
      g.classList.remove("error")
    );
  }

  function marcar(campo, mensaje) {
    errores[campo].textContent = mensaje;
    campos[campo].closest(".input-group").classList.add("error");
  }

  /* ===============================
     SUBMIT FORM
  ================================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    let valido = true;

    if (campos.nombre.value.trim() === "") {
      marcar("nombre", "Ingresa tu nombre");
      valido = false;
    }

    if (!esCorreoValido(campos.correo.value.trim())) {
      marcar("correo", "Correo electrónico no válido");
      valido = false;
    }

    if (campos.telefono.value.trim().length < 8) {
      marcar("telefono", "Teléfono inválido");
      valido = false;
    }

    if (campos.password.value.length < 6) {
      marcar("password", "Mínimo 6 caracteres");
      valido = false;
    }

    if (campos.password.value !== campos.confirm.value) {
      marcar("confirm", "Las contraseñas no coinciden");
      valido = false;
    }

    if (!valido) return;

    /* ===============================
       SUPABASE
    ================================= */
    try {
      await registerUser(
        campos.correo.value.trim(),
        campos.password.value.trim(),
        campos.telefono.value.trim(),
        campos.nombre.value.trim(),
        "Honduras",
        fotoBase64
      );

      alert("Cuenta creada con éxito ✔");
      window.location.href = "login.html";

    } catch (err) {
      alert("Error registrando usuario");
      console.error(err);
    }
  });

});
