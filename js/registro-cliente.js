// ============================================================
// REGISTRO DE CLIENTE — Versión estable con comentarios cortos
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  // Cliente global de Supabase y función de registro
  const sb = window.supabaseClient;
  const registerUser = window.supabaseAuth.registerUser;

  // Formulario y campos
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

  // Limpia todos los errores visuales
  function limpiarErrores() {
    Object.values(errores).forEach(e => e.textContent = "");
    document.querySelectorAll(".input-group")
      .forEach(g => g.classList.remove("error", "success"));
  }

  // Marca un campo como error o éxito
  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    if (!input) return;

    const grupo = input.closest(".input-group");
    if (!grupo) return; // Seguridad: evita romper el script

    if (success) {
      grupo.classList.add("success");
      errores[campo].textContent = "";
      return;
    }

    grupo.classList.add("error");
    errores[campo].textContent = mensaje;
  }

  // Validación de email opcional
  function esCorreoValido(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Indicador de fortaleza de contraseña
  const passwordStrengthLabel = document.createElement("small");
  passwordStrengthLabel.classList.add("password-strength");
  campos.password.parentElement.after(passwordStrengthLabel);

  campos.password.addEventListener("input", () => {
    const value = campos.password.value;

    if (!value) {
      passwordStrengthLabel.textContent = "";
      return;
    }

    if (value.length < 6) {
      passwordStrengthLabel.textContent = "Contraseña débil";
      passwordStrengthLabel.className = "password-strength password-weak";
    } else if (value.length < 10) {
      passwordStrengthLabel.textContent = "Seguridad media";
      passwordStrengthLabel.className = "password-strength password-medium";
    } else {
      passwordStrengthLabel.textContent = "Contraseña fuerte";
      passwordStrengthLabel.className = "password-strength password-strong";
    }
  });

  // Mostrar/ocultar contraseña
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = icon.previousElementSibling;
      input.type = input.type === "password" ? "text" : "password";
      icon.textContent = input.type === "password" ? "visibility_off" : "visibility";
    });
  });

  // Verifica si ya existe un correo o teléfono
  async function existeUsuario(correo, telefono) {
    const { data } = await sb
      .from("users")
      .select("email, phone")
      .or(`email.eq.${correo},phone.eq.${telefono}`);

    return data?.length ? data[0] : null;
  }

  // Botón con loader
  const btn = document.querySelector(".btn-register");

  // Evento principal del formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    let valido = true;

    // Validaciones básicas
    if (!campos.nombre.value.trim()) {
      marcar("nombre", "Ingresa tu nombre");
      valido = false;
    } else marcar("nombre", "", true);

    if (campos.telefono.value.trim().length < 8) {
      marcar("telefono", "Teléfono inválido");
      valido = false;
    } else marcar("telefono", "", true);

    if (!esCorreoValido(campos.correo.value.trim())) {
      marcar("correo", "Correo no válido");
      valido = false;
    } else marcar("correo", "", true);

    if (campos.password.value.length < 6) {
      marcar("password", "Mínimo 6 caracteres");
      valido = false;
    } else marcar("password", "", true);

    if (campos.password.value !== campos.confirm.value) {
      marcar("confirm", "Las contraseñas no coinciden");
      valido = false;
    } else marcar("confirm", "", true);

    if (!valido) return;

    // Activar loader
    btn.classList.add("loading");
    btn.disabled = true;

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    // Verificar duplicados
    const existente = await existeUsuario(correo, tel);

    if (existente) {
      btn.classList.remove("loading");
      btn.disabled = false;

      if (existente.email === correo) marcar("correo", "El correo ya existe");
      if (existente.phone === tel) marcar("telefono", "El teléfono ya existe");
      return;
    }

    // Registro final
    try {
      await registerUser(
        correo,
        campos.password.value.trim(),
        tel,
        campos.nombre.value.trim(),
        "Honduras",
        null
      );

      mostrarSnackbar("Cuenta creada con éxito");
      setTimeout(() => window.location.href = "login.html", 1500);

    } catch (err) {
      console.error("❌ ERROR REGISTRO:", err);
      btn.classList.remove("loading");
      btn.disabled = false;
      alert("Error registrando usuario");
    }
  });

  // Snackbar de confirmación
  function mostrarSnackbar(msg) {
    const s = document.getElementById("snackbar");
    s.textContent = msg;
    s.classList.add("show");
    setTimeout(() => s.classList.remove("show"), 2600);
  }

});
