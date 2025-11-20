// ============================================================
// REGISTRO DE CLIENTE — VALIDACIÓN EN CADENA + LABEL GOOGLE + BARRAS M3
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

    // restaurar labels a su texto original
    document.querySelectorAll(".floating-label").forEach(label => {
      if (label.dataset.original) {
        label.textContent = label.dataset.original;
        label.style.color = "";
      }
    });
  }

  // ============================================================
  // MARCAR ERROR / ÉXITO — LABEL DENTRO DEL INPUT ESTILO GOOGLE
  // ============================================================
  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");
    const label = grupo.querySelector(".floating-label");

    if (!label.dataset.original) {
      label.dataset.original = label.textContent;
    }

    const vacio = input.value.trim().length === 0;

    if (success) {
      grupo.classList.remove("error");
      grupo.classList.add("success");
      label.textContent = label.dataset.original;
      errores[campo].textContent = "";
      return;
    }

    grupo.classList.add("error");

    if (vacio) {
      // error adentro del campo
      label.textContent = mensaje;
      errores[campo].textContent = "";
    } else {
      // error abajo
      label.textContent = label.dataset.original;
      errores[campo].textContent = mensaje;
    }
  }

  // ============================================================
  // VALIDAR CORREO
  // ============================================================
  function esCorreoValido(email) {
    if (!email) return true; // opcional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ============================================================
  // BARRAS DE FUERZA (M3 EXPRESSIVE)
  // ============================================================
  const bars = document.querySelectorAll(".strength-bar");

  campos.password.addEventListener("input", () => {
    const v = campos.password.value;

    bars.forEach(b => b.className = "strength-bar"); // reset

    if (!v) return;

    if (v.length < 6) {
      bars[0].classList.add("active-weak");
    } else if (v.length < 10) {
      bars[0].classList.add("active-medium");
      bars[1].classList.add("active-medium");
      bars[2].classList.add("active-medium");
    } else {
      bars.forEach(b => b.classList.add("active-strong"));
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
  // COMPROBAR DUPLICADOS EN SUPABASE
  // ============================================================
  async function existeUsuario(correo, telefono) {
    const { data } = await sb
      .from("users")
      .select("email, phone")
      .or(`email.eq.${correo},phone.eq.${telefono}`);
    return data?.length ? data[0] : null;
  }

  // ============================================================
  // VALIDACIÓN EN CADENA
  // ============================================================
  function validarEnCadena() {

    if (!campos.nombre.value.trim()) {
      marcar("nombre", "Ingresa tu nombre");
      return false;
    }
    marcar("nombre", "", true);

    if (campos.telefono.value.trim().length < 8) {
      marcar("telefono", "Teléfono inválido");
      return false;
    }
    marcar("telefono", "", true);

    const correo = campos.correo.value.trim();

    if (!esCorreoValido(correo)) {
      marcar("correo", "Correo no válido");
      return false;
    }
    marcar("correo", "", true);

    if (campos.password.value.length < 6) {
      marcar("password", "Mínimo 6 caracteres");
      return false;
    }
    marcar("password", "", true);

    if (campos.password.value !== campos.confirm.value) {
      marcar("confirm", "Las contraseñas no coinciden");
      return false;
    }
    marcar("confirm", "", true);

    return true;
  }

  // ============================================================
  // SUBMIT FINAL
  // ============================================================
  const btn = document.querySelector(".m3-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    if (!validarEnCadena()) return;

    btn.classList.add("loading");
    btn.disabled = true;

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    const existente = await existeUsuario(correo, tel);

    if (existente) {
      btn.classList.remove("loading");
      btn.disabled = false;

      if (correo && existente.email === correo)
        marcar("correo", "El correo ya existe");

      if (existente.phone === tel)
        marcar("telefono", "El teléfono ya existe");

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
