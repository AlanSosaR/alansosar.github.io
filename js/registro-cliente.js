// ============================================================
// REGISTRO DE CLIENTE — VALIDACIÓN AVANZADA TIPO GMAIL
// Loader Material 3 (igual que login) + 6 barras Apple Style
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

  const btn = document.querySelector(".m3-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".loader");


  // ============================================================
  // Limpieza de errores
  // ============================================================
  function limpiarErrores() {
    Object.values(errores).forEach(e => e.textContent = "");
    document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error", "success"));
  }

  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    const grupo = input.closest(".m3-input");

    if (success) {
      grupo.classList.remove("error");
      grupo.classList.add("success");
      errores[campo].textContent = "";
      return;
    }

    grupo.classList.add("error");
    errores[campo].textContent = mensaje;
  }


  // ============================================================
  // VALIDACIÓN AVANZADA — CORREOS
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
    "gmaik.com": "gmail.com",
    "hotmai.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com"
  };

  function correoValido(correo) {
    if (!correo.includes("@")) return false;

    const partes = correo.split("@");
    if (partes.length !== 2) return false;

    const dominio = partes[1].toLowerCase();

    if (autocorrecciones[dominio]) {
      campos.correo.value = partes[0] + "@" + autocorrecciones[dominio];
      return true;
    }

    if (!dominio.includes(".")) return false;

    return dominiosValidos.some(d => dominio.endsWith(d));
  }


  // ============================================================
  // VALIDACIÓN TELÉFONO
  // ============================================================
  function telefonoValido(t) {
    const limpio = t.replace(/[\s-+]/g, "");
    return /^[0-9]{7,15}$/.test(limpio);
  }


  // ============================================================
  // VALIDACIÓN PASSWORD
  // ============================================================
  function passwordValida(p) {
    if (p.length < 6) return false;
    if (p.includes(" ")) return false;
    return true;
  }


  // ============================================================
  // BARRAS SEGURIDAD PASSWORD — 6 BARRAS ESTILO APPLE
  // ============================================================
  const bars = document.querySelectorAll(".strength-bar");
  const barsContainer = document.getElementById("barsContainer");

  campos.password.addEventListener("input", () => {
    const v = campos.password.value.trim();

    // resetear clases
    bars.forEach(b => b.className = "strength-bar");

    if (v.length === 0) {
      barsContainer.style.display = "none";
      return;
    }

    barsContainer.style.display = "flex";

    // Nivel 1 y 2 — MUY DÉBIL
    if (v.length < 4) {
      bars[0].classList.add("active-weak");
      return;
    }
    if (v.length < 6) {
      bars[0].classList.add("active-weak");
      bars[1].classList.add("active-weak");
      return;
    }

    // Nivel 3 y 4 — MEDIO
    if (v.length < 8) {
      bars[0].classList.add("active-medium");
      bars[1].classList.add("active-medium");
      bars[2].classList.add("active-medium");
      return;
    }
    if (v.length < 10) {
      bars[0].classList.add("active-medium");
      bars[1].classList.add("active-medium");
      bars[2].classList.add("active-medium");
      bars[3].classList.add("active-medium");
      return;
    }

    // Nivel 5 — FUERTE
    if (v.length < 14) {
      bars.forEach((b, i) => i < 5 && b.classList.add("active-strong"));
      return;
    }

    // Nivel 6 — CONTRASEÑA MUY FUERTE
    bars.forEach(b => b.classList.add("active-max"));
  });


  // ============================================================
  // MOSTRAR / OCULTAR PASSWORD
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      icon.textContent = input.type === "password"
        ? "visibility"
        : "visibility_off";
    });
  });


  // ============================================================
  // LOADING
  // ============================================================
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
  // VALIDACIÓN COMPLETA
  // ============================================================
  function validar() {

    if (!campos.nombre.value.trim()) {
      marcar("nombre", "Ingresa tu nombre");
      return false;
    }
    marcar("nombre", "", true);

    if (!campos.correo.value.trim()) {
      marcar("correo", "Correo obligatorio");
      return false;
    }

    if (!correoValido(campos.correo.value.trim())) {
      marcar("correo", "Correo no válido");
      return false;
    }
    marcar("correo", "", true);

    if (!telefonoValido(campos.telefono.value.trim())) {
      marcar("telefono", "Teléfono inválido");
      return false;
    }
    marcar("telefono", "", true);

    if (!passwordValida(campos.password.value.trim())) {
      marcar("password", "Contraseña no válida");
      return false;
    }
    marcar("password", "", true);

    if (campos.password.value !== campos.confirm.value) {
      marcar("confirm", "No coincide");
      return false;
    }
    marcar("confirm", "", true);

    return true;
  }


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
  // SUBMIT FINAL
  // ============================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    if (!validar()) return;

    activarLoading();

    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();

    const existe = await existeUsuario(correo, tel);

    if (existe) {
      desactivarLoading();

      if (existe.email === correo) marcar("correo", "Correo ya existe");
      if (existe.phone === tel) marcar("telefono", "Teléfono ya registrado");

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
      desactivarLoading();
      mostrarSnackbar("Error creando cuenta");
      console.error(err);
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
