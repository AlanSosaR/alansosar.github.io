// ============================================================
// REGISTRO DE CLIENTE — Café Cortero (VERSIÓN FINAL PREMIUM)
// Floating Label + Error Café + Éxito Verde + Snackbar con Logo
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

  const mensajesVacios = {
    nombre: "Ingresa tu nombre",
    correo: "Ingresa tu correo",
    telefono: "Ingresa tu teléfono",
    password: "Ingresa tu contraseña",
    confirm: "Confirma tu contraseña",
  };

  // ============================================================
  // AUTOCORRECCIÓN DE CORREO
  // ============================================================
  const autocorrecciones = {
    "gmal.com": "gmail.com",
    "gmial.com": "gmail.com",
    "hotmai.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com"
  };

  // ============================================================
  // NORMALIZAR TELÉFONO
  // ============================================================
  function normalizarTelefono(tel) {
    if (!tel) return "";
    tel = tel.replace(/[\s\-()]/g, "");
    if (tel.startsWith("00")) tel = "+" + tel.slice(2);
    tel = tel.replace(/^\+/, "");
    return tel;
  }

  // ============================================================
  // LIMPIAR ERROR
  // ============================================================
  function limpiarErrorCampo(campo) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");

    grupo.classList.remove("error", "success");
    errores[campo].textContent = "";
    input.placeholder = " ";
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
      input.placeholder = " ";
      return;
    }

    grupo.classList.add("error");
    grupo.classList.remove("success");

    if (!input.value.trim()) {
      input.placeholder = mensajesVacios[campo];
      errores[campo].textContent = "";
    } else {
      errores[campo].textContent = mensaje;
      input.placeholder = " ";
    }
  }

  // ============================================================
  // VALIDAR CORREO
  // ============================================================
  function esCorreoValido(email) {
    if (!email) return false;

    const regexGeneral = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!regexGeneral.test(email)) return false;

    let [usuario, dominio] = email.split("@");

    dominio = dominio.toLowerCase();

    if (autocorrecciones[dominio]) {
      campos.correo.value = `${usuario}@${autocorrecciones[dominio]}`;
    }

    return true;
  }

  // ============================================================
  // VERDE EN VIVO
  // ============================================================
  function activarVerdeEnVivo(campo, validador) {
    campos[campo].addEventListener("input", () => {
      const input = campos[campo];
      const grupo = input.closest(".m3-input");

      errores[campo].textContent = "";
      grupo.classList.remove("error");

      if (!input.value.trim()) {
        grupo.classList.remove("success");
        return;
      }

      if (validador(input.value.trim())) {
        grupo.classList.add("success");
      } else {
        grupo.classList.remove("success");
      }
    });
  }

  activarVerdeEnVivo("nombre", v => v.length >= 2);
  activarVerdeEnVivo("correo", v => esCorreoValido(v));
  activarVerdeEnVivo("telefono", v => v.length >= 8);
  activarVerdeEnVivo("password", v => v.length >= 6);
  activarVerdeEnVivo("confirm", v => v === campos.password.value.trim());

  // ============================================================
  // BLUR FINAL
  // ============================================================
  campos.nombre.addEventListener("blur", () => {
    const v = campos.nombre.value.trim();
    if (!v) marcar("nombre", mensajesVacios.nombre);
    else marcar("nombre", "", true);
  });

  campos.correo.addEventListener("blur", () => {
    const v = campos.correo.value.trim();
    if (!v) return marcar("correo", mensajesVacios.correo);
    if (!esCorreoValido(v)) return marcar("correo", "Correo no válido");
    marcar("correo", "", true);
  });

  campos.telefono.addEventListener("blur", () => {
    if (campos.telefono.value.trim().length < 8)
      marcar("telefono", mensajesVacios.telefono);
    else marcar("telefono", "", true);
  });

  campos.password.addEventListener("blur", () => {
    if (campos.password.value.trim().length < 6)
      marcar("password", mensajesVacios.password);
    else marcar("password", "", true);
  });

  campos.confirm.addEventListener("blur", () => {
    if (campos.confirm.value !== campos.password.value)
      marcar("confirm", "Las contraseñas no coinciden");
    else marcar("confirm", "", true);
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
  async function existeUsuario(correo, telefonoRaw) {

    const telefonoNormalizado = normalizarTelefono(telefonoRaw);

    const { data } = await sb
      .from("users")
      .select("email, phone");

    const coincide = data?.find(row =>
      row.email === correo ||
      normalizarTelefono(row.phone) === telefonoNormalizado
    );

    return coincide || null;
  }

  // ============================================================
  // VALIDACIÓN FINAL
  // ============================================================
  function validarEnCadena() {

    if (!campos.nombre.value.trim())
      return marcar("nombre", mensajesVacios.nombre), false;

    const correo = campos.correo.value.trim();
    if (!correo || !esCorreoValido(correo))
      return marcar("correo", "Correo no válido"), false;

    if (campos.telefono.value.trim().length < 8)
      return marcar("telefono", mensajesVacios.telefono), false;

    if (campos.password.value.trim().length < 6)
      return marcar("password", mensajesVacios.password), false;

    if (campos.password.value !== campos.confirm.value)
      return marcar("confirm", "Las contraseñas no coinciden"), false;

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
    btnLoader.style.display = "inline-block";
  }

  function desactivarLoading() {
    btn.classList.remove("loading");
    btn.disabled = false;
    btnText.style.opacity = "1";
    btnLoader.style.display = "none";
  }

  // ============================================================
  // ENVÍO FINAL
  // ============================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validarEnCadena()) return;

    activarLoading();

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    const existe = await existeUsuario(correo, tel);

    if (existe) {
      desactivarLoading();

      if (existe.email === correo)
        marcar("correo", "El correo ya existe");

      if (normalizarTelefono(existe.phone) === normalizarTelefono(tel))
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

      // 🔥 NUEVO MENSAJE PREMIUM
      mostrarSnackbar(
        "Cuenta creada con éxito. Revisa tu correo y confirma tu cuenta para comenzar tu experiencia Café Cortero."
      );

      setTimeout(() => window.location.href = "login.html", 1600);

    } catch (err) {
      console.error(err);
      mostrarSnackbar("Error creando la cuenta");
      desactivarLoading();
    }
  });

  // ============================================================
  // SNACKBAR PREMIUM CON LOGO
  // ============================================================
  function mostrarSnackbar(msg) {
    const bar = document.getElementById("snackbar");
    bar.innerHTML = `
      <img src="imagenes/logo_secundario.png" class="snack-logo">
      <span>${msg}</span>
    `;
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 3000);
  }

});
