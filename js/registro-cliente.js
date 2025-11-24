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

  // Placeholders correctos
  const mensajesVacios = {
    nombre: "Ingresa tu nombre",
    correo: "Ingresa tu correo",
    telefono: "Ingresa tu teléfono",
    password: "Ingresa tu contraseña",
    confirm: "Confirma tu contraseña",
  };

  // ============================================================
  // DOMINIOS + AUTOCORRECCIONES
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
  // LIMPIAR ERROR DE UN CAMPO
  // ============================================================
  function limpiarErrorCampo(campo) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");

    grupo.classList.remove("error", "success");
    errores[campo].textContent = "";
    input.placeholder = "";
  }

  // ============================================================
  // MARCAR ERROR / ÉXITO FINAL
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
      input.placeholder = mensajesVacios[campo];
      errores[campo].textContent = "";
    } else {
      errores[campo].textContent = mensaje;
      input.placeholder = "";
    }
  }

  // ============================================================
  // CORREO — VALIDACIÓN + AUTOCORRECCIÓN
  // ============================================================
  function esCorreoValido(email) {
    if (!email) return false;

    const regexGeneral = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!regexGeneral.test(email)) return false;

    const partes = email.split("@");
    const usuario = partes[0];
    let dominio = (partes[1] || "").toLowerCase();

    if (autocorrecciones[dominio]) {
      dominio = autocorrecciones[dominio];
      campos.correo.value = `${usuario}@${dominio}`;
    }

    return true;
  }

  // ============================================================
  // VERDE EN VIVO PARA TODA ENTRADA
  // ============================================================
  function activarVerdeEnVivo(campo, validador) {
    campos[campo].addEventListener("input", () => {
      const input = campos[campo];
      const grupo = input.closest(".m3-input");

      limpiarErrorCampo(campo);

      if (!input.value.trim()) {
        grupo.classList.remove("success");
        return;
      }

      if (validador(input.value.trim())) {
        grupo.classList.add("success");
      }
    });
  }

  activarVerdeEnVivo("nombre", v => v.length >= 2);
  activarVerdeEnVivo("correo", v => esCorreoValido(v));
  activarVerdeEnVivo("telefono", v => v.length >= 8);
  activarVerdeEnVivo("password", v => v.length >= 6);
  activarVerdeEnVivo("confirm", v => v === campos.password.value.trim());

  // ============================================================
  // VALIDACIÓN ON BLUR (FINAL)
  // ============================================================
  campos.nombre.addEventListener("blur", () => {
    const v = campos.nombre.value.trim();
    if (!v) marcar("nombre", mensajesVacios.nombre);
    else marcar("nombre", "", true);
  });

  campos.correo.addEventListener("blur", () => {
    const correo = campos.correo.value.trim();
    if (!correo) return marcar("correo", mensajesVacios.correo);
    if (!esCorreoValido(correo)) return marcar("correo", "Correo no válido");
    marcar("correo", "", true);
  });

  campos.telefono.addEventListener("blur", () => {
    const v = campos.telefono.value.trim();
    if (v.length < 8) marcar("telefono", mensajesVacios.telefono);
    else marcar("telefono", "", true);
  });

  campos.password.addEventListener("blur", () => {
    const v = campos.password.value.trim();
    if (v.length < 6) marcar("password", mensajesVacios.password);
    else marcar("password", "", true);
  });

  campos.confirm.addEventListener("blur", () => {
    const pass = campos.password.value.trim();
    const conf = campos.confirm.value.trim();
    if (!conf) marcar("confirm", mensajesVacios.confirm);
    else if (pass !== conf) marcar("confirm", "Las contraseñas no coinciden");
    else marcar("confirm", "", true);
  });

  // ============================================================
  // BARRAS SEGURIDAD
  // ============================================================
  const bars = document.querySelectorAll(".strength-bar");
  const barsContainer = document.getElementById("barsContainer");

  campos.password.addEventListener("input", () => {
    const v = campos.password.value.trim();

    bars.forEach(b => b.className = "strength-bar");

    if (v.length === 0) return barsContainer.style.display = "none";

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
  // TOGGLE PASSWORD
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      icon.textContent = input.type === "password" ? "visibility" : "visibility_off";
    });
  });

  // ============================================================
  // CHEQUEAR DUPLICADOS
  // ============================================================
  async function existeUsuario(correo, telefono) {
    const { data } = await sb
      .from("users")
      .select("email, phone")
      .or(`email.eq.${correo},phone.eq.${telefono}`);

    return data?.length ? data[0] : null;
  }

  // ============================================================
  // VALIDAR EN CADENA
  // ============================================================
  function validarEnCadena() {

    if (!campos.nombre.value.trim()) {
      marcar("nombre", mensajesVacios.nombre);
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
      marcar("telefono", mensajesVacios.telefono);
      return false;
    }
    marcar("telefono", "", true);

    if (campos.password.value.length < 6) {
      marcar("password", mensajesVacios.password);
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
  // LOADING BUTTON
  // ============================================================
  const btn = document.querySelector(".m3-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".loader");

  function activarLoading() {
    btn.classList.add("loading");
    btn.disabled = true;
    btnText.style.opacity = "0";
    btnText.style.position = "absolute";
    btnLoader.style.display = "inline-block";
  }

  function desactivarLoading() {
    btn.classList.remove("loading");
    btn.disabled = false;
    btnText.style.opacity = "1";
    btnText.style.position = "relative";
    btnLoader.style.display = "none";
  }

  // ============================================================
  // SUBMIT
  // ============================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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
  // BOTÓN ATRÁS
  // ============================================================
  const backBtn = document.querySelector(".back-btn");
  if (backBtn) backBtn.addEventListener("click", () => window.location.href = "login.html");

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
