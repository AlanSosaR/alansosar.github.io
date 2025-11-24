// ============================================================
// REGISTRO DE CLIENTE — LABEL ARRIBA + ERROR ADENTRO + BARRAS M3
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
  // DOMINIOS + AUTOCORRECCIONES (MISMOS QUE LOGIN)
  // ============================================================
  const dominiosValidos = [
    "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com",
    "proton.me", "live.com", "msn.com",
    "unah.hn", "unah.edu", "gmail.es", "correo.hn",
    "googlemail.com", "outlook.es", "hotmail.es"
  ];

  const autocorrecciones = {
    "gmal.com": "gmail.com",
    "gmial.com": "gmail.com",
    "hotmai.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com"
  };

  // ============================================================
  // LIMPIAR ERRORES
  // ============================================================
  function limpiarErrores() {
    Object.values(errores).forEach(e => e.textContent = "");
    document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error", "success"));
    Object.values(campos).forEach(c => c.placeholder = "");
  }

  function limpiarErrorCampo(campo) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");
    grupo.classList.remove("error", "success");
    errores[campo].textContent = "";
    input.placeholder = "";
  }

  // ============================================================
  // MARCAR ERROR / ÉXITO — LABEL SIEMPRE ARRIBA
  // ============================================================
  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");

    if (success) {
      grupo.classList.remove("error");
      grupo.classList.add("success");
      errores[campo].textContent = "";
      input.placeholder = "";
      return;
    }

    grupo.classList.add("error");

    if (input.value.trim() === "") {
      input.placeholder = mensaje;
      errores[campo].textContent = "";
    } else {
      errores[campo].textContent = mensaje;
      input.placeholder = "";
    }
  }

  // ============================================================
  // VALIDAR CORREO + AUTOCORRECCIÓN ESTILO LOGIN
  // ============================================================
  function esCorreoValido(email) {
    if (!email) return true; // se valida aparte que sea obligatorio

    const regexGeneral = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!regexGeneral.test(email)) return false;

    const partes = email.split("@");
    const usuario = partes[0];
    let dominio = (partes[1] || "").toLowerCase();

    // autocorrección del dominio
    if (autocorrecciones[dominio]) {
      dominio = autocorrecciones[dominio];
      const corregido = `${usuario}@${dominio}`;
      campos.correo.value = corregido; // se corrige en vivo en el input
      email = corregido;
    }

    // si el dominio coincide con alguno de la lista, perfecto
    if (dominiosValidos.some(d => dominio.endsWith(d))) {
      return true;
    }

    // si no, igual permitimos otros dominios válidos (empresa, etc.)
    return true;
  }

  // ============================================================
  // BARRAS DE SEGURIDAD — 6 BARRAS
  // ============================================================
  const bars = document.querySelectorAll(".strength-bar");
  const barsContainer = document.getElementById("barsContainer");

  campos.password.addEventListener("input", () => {
    const v = campos.password.value.trim();

    limpiarErrorCampo("password");

    // Reiniciar barras
    bars.forEach(b => b.className = "strength-bar");

    if (v.length === 0) {
      barsContainer.style.display = "none";
      return;
    }

    barsContainer.style.display = "flex";

    if (v.length < 6) {
      bars[0].classList.add("active-weak");
    } else if (v.length < 10) {
      bars[0].classList.add("active-medium");
      bars[1].classList.add("active-medium");
      bars[2].classList.add("active-medium");
    } else if (v.length < 14) {
      for (let i = 0; i < 4; i++) bars[i].classList.add("active-strong");
    } else if (v.length < 18) {
      for (let i = 0; i < 5; i++) bars[i].classList.add("active-strong");
    } else {
      bars.forEach(b => b.classList.add("active-strong"));
    }
  });

  // ============================================================
  // VALIDACIÓN EN VIVO POR CAMPO (INPUT + BLUR)
  // ============================================================

  // Nombre
  campos.nombre.addEventListener("input", () => limpiarErrorCampo("nombre"));
  campos.nombre.addEventListener("blur", () => {
    const v = campos.nombre.value.trim();
    if (!v) {
      marcar("nombre", "Ingresa tu nombre");
    } else {
      marcar("nombre", "", true);
    }
  });

  // Correo
  campos.correo.addEventListener("input", () => limpiarErrorCampo("correo"));
  campos.correo.addEventListener("blur", () => {
    const correo = campos.correo.value.trim();
    if (!correo) {
      marcar("correo", "Ingresa tu correo");
      return;
    }
    if (!esCorreoValido(correo)) {
      marcar("correo", "Correo no válido");
      return;
    }
    marcar("correo", "", true);
  });

  // Teléfono
  campos.telefono.addEventListener("input", () => limpiarErrorCampo("telefono"));
  campos.telefono.addEventListener("blur", () => {
    const tel = campos.telefono.value.trim();
    if (tel.length < 8) {
      marcar("telefono", "Teléfono inválido");
    } else {
      marcar("telefono", "", true);
    }
  });

  // Confirmación en vivo
  campos.confirm.addEventListener("input", () => limpiarErrorCampo("confirm"));
  campos.confirm.addEventListener("blur", () => {
    const pass = campos.password.value;
    const conf = campos.confirm.value;
    if (!conf) return;
    if (pass !== conf) {
      marcar("confirm", "Las contraseñas no coinciden");
    } else {
      marcar("confirm", "", true);
    }
  });

  // ============================================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      icon.textContent = input.type === "password" ? "visibility" : "visibility_off";
    });
  });

  // ============================================================
  // VERIFICAR DUPLICADOS
  // ============================================================
  async function existeUsuario(correo, telefono) {
    const { data } = await sb
      .from("users")
      .select("email, phone")
      .or(`email.eq.${correo},phone.eq.${telefono}`);

    return data?.length ? data[0] : null;
  }

  // ============================================================
  // VALIDACIÓN EN CADENA (SUBMIT)
  // ============================================================
  function validarEnCadena() {

    if (!campos.nombre.value.trim()) {
      marcar("nombre", "Ingresa tu nombre");
      return false;
    }
    marcar("nombre", "", true);

    const correo = campos.correo.value.trim();
    if (!correo || !esCorreoValido(correo)) {
      marcar("correo", "Correo no válido");
      return false;
    }
    marcar("correo", "", true);

    if (campos.telefono.value.trim().length < 8) {
      marcar("telefono", "Teléfono inválido");
      return false;
    }
    marcar("telefono", "", true);

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
  // BOTÓN — LOADING M3 EXPRESSIVE
  // ============================================================
  const btn = document.querySelector(".m3-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".loader");

  function activarLoading() {
    btn.classList.add("loading");
    btn.disabled = true;
    btnText.style.opacity = "0";
    btnLoader.style.display = "inline-block";
  }

  function desactivarLoading() {
    btn.classList.remove("loading");
    btn.disabled = false;
    btnText.style.opacity = "1";
    btnLoader.style.display = "none";
  }

  // ============================================================
  // SUBMIT FINAL
  // ============================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    if (!validarEnCadena()) return;

    activarLoading();

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    const existente = await existeUsuario(correo, tel);

    if (existente) {
      desactivarLoading();

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

      setTimeout(() => window.location.href = "login.html", 1200);

    } catch (err) {
      console.error(err);
      mostrarSnackbar("Error creando la cuenta");
      desactivarLoading();
    }
  });

  // ============================================================
  // BOTÓN ATRÁS — IGUAL QUE LOGIN
  // ============================================================
  const backBtn = document.querySelector(".back-btn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

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
