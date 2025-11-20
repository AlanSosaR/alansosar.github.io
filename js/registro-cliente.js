// ============================================================
// REGISTRO CLIENTE — VERSIÓN GLOBAL SIN IMPORTS
// Usa el cliente ya creado en core-scripts.js
// Usa window.supabaseAuth.registerUser desde supabase-auth.js
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient; // cliente global
  const registerUser = window.supabaseAuth.registerUser; // función global auth

  /* ===============================
     CAMPOS
  ================================= */
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

  /* ===============================
     UTILIDADES
  ================================= */
  function limpiarErrores() {
    Object.values(errores).forEach(e => e.textContent = "");
    document.querySelectorAll(".input-group").forEach(g => {
      g.classList.remove("error", "success");
    });
  }

  function marcar(campo, mensaje, success = false) {
    const grupo = campos[campo].closest(".input-group");

    if (success) {
      grupo.classList.add("success");
      errores[campo].textContent = "";
      return;
    }

    grupo.classList.add("error");
    errores[campo].textContent = mensaje;
  }

  function esCorreoValido(email) {
    if (!email) return true; // correo es opcional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /* ===============================
     PASSWORD STRENGTH
  ================================= */
  const passwordStrengthLabel = document.createElement("small");
  passwordStrengthLabel.classList.add("password-strength");
  campos.password.parentElement.after(passwordStrengthLabel);

  campos.password.addEventListener("input", () => {
    const value = campos.password.value;

    if (value.length < 1) {
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


  /* ===============================
     MOSTRAR / OCULTAR CONTRASEÑA
  ================================= */
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = icon.previousElementSibling;
      input.type = input.type === "password" ? "text" : "password";
      icon.textContent = input.type === "password" ? "visibility_off" : "visibility";
    });
  });


  /* ===============================
     CHECK DUPLICADOS EN SUPABASE
  ================================= */
  async function existeUsuario(correo, telefono) {
    const { data, error } = await sb
      .from("users")
      .select("email, phone")
      .or(`email.eq.${correo},phone.eq.${telefono}`);

    return data?.length ? data[0] : null;
  }


  /* ===============================
     BOTÓN LOADER
  ================================= */
  const btn = document.querySelector(".btn-register");

  /* ===============================
     SUBMIT FORM
  ================================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    let valido = true;

    // 🟤 Validaciones
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

    /* ===========================
       ACTIVAR LOADER
    ============================ */
    btn.classList.add("loading");
    btn.disabled = true;

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    /* ===========================
       DUPLICADOS
    ============================ */
    const existente = await existeUsuario(correo, tel);

    if (existente) {
      btn.classList.remove("loading");
      btn.disabled = false;

      if (existente.email === correo) marcar("correo", "El correo ya existe");
      if (existente.phone === tel) marcar("telefono", "El teléfono ya existe");
      return;
    }

    /* ===============================
       REGISTRO FINAL
    ================================= */
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


  /* ===============================
     SNACKBAR
  ================================= */
  function mostrarSnackbar(msg) {
    const s = document.getElementById("snackbar");
    s.textContent = msg;
    s.classList.add("show");
    setTimeout(() => s.classList.remove("show"), 2600);
  }

});
