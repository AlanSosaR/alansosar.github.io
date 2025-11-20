// ============================================================
// REGISTRO DE CLIENTE — VERSIÓN FINAL M3 EXPRESSIVE (FUNCIONANDO)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const registerUser = window.supabaseAuth.registerUser;

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

  // ============================================================
  // LIMPIAR ERRORES
  // ============================================================
  function limpiarErrores() {
    Object.values(errores).forEach(e => (e.textContent = ""));
    document.querySelectorAll(".m3-input")
      .forEach(g => g.classList.remove("error", "success"));
  }

  // ============================================================
  // MARCAR ERROR / ÉXITO
  // ============================================================
  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");

    if (success) {
      grupo.classList.remove("error");
      grupo.classList.add("success");
      errores[campo].textContent = "";
      return;
    }

    grupo.classList.remove("success");
    grupo.classList.add("error");
    errores[campo].textContent = mensaje;
  }

  // ============================================================
  // VALIDAR CORREO
  // ============================================================
  function esCorreoValido(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ============================================================
  // FORTALEZA DE CONTRASEÑA
  // ============================================================
  const passwordStrengthLabel = document.getElementById("passwordStrength");

  campos.password.addEventListener("input", () => {
    const v = campos.password.value;

    if (!v) {
      passwordStrengthLabel.textContent = "";
      passwordStrengthLabel.className = "password-strength";
      return;
    }

    if (v.length < 6) {
      passwordStrengthLabel.textContent = "Contraseña débil";
      passwordStrengthLabel.className = "password-strength password-weak";
    } else if (v.length < 10) {
      passwordStrengthLabel.textContent = "Seguridad media";
      passwordStrengthLabel.className = "password-strength password-medium";
    } else {
      passwordStrengthLabel.textContent = "Contraseña fuerte";
      passwordStrengthLabel.className = "password-strength password-strong";
    }
  });

  // ============================================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      icon.textContent =
        input.type === "password" ? "visibility" : "visibility_off";
    });
  });

  // ============================================================
  // VERIFICAR DUPLICADOS EN SUPABASE
  // ============================================================
  async function existeUsuario(correo, telefono) {
    const { data } = await sb
      .from("users")
      .select("email, phone")
      .or(`email.eq.${correo},phone.eq.${telefono}`);

    return data?.length ? data[0] : null;
  }

  // ============================================================
  // SUBMIT
  // ============================================================
  const btn = document.querySelector(".m3-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    let valido = true;

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

    btn.classList.add("loading");
    btn.disabled = true;

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    const existente = await existeUsuario(correo, tel);

    if (existente) {
      btn.classList.remove("loading");
      btn.disabled = false;

      if (existente.email === correo) marcar("correo", "El correo ya existe");
      if (existente.phone === tel) marcar("telefono", "El teléfono ya existe");
      return;
    }

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
      setTimeout(() => (window.location.href = "login.html"), 1300);

    } catch (err) {
      mostrarSnackbar("Error creando la cuenta");
      console.error(err);
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  });

  // ============================================================
  // SNACKBAR
  // ============================================================
  function mostrarSnackbar(msg) {
    const bar = document.getElementById("snackbar");
    bar.textContent = msg;
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 2600);
  }
});
