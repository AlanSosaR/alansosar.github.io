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
  // LIMPIAR ERRORES
  // ============================================================
  function limpiarErrores() {
    Object.values(errores).forEach(e => e.textContent = "");
    document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error", "success"));
    Object.values(campos).forEach(c => c.placeholder = "");
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
  // VALIDAR CORREO
  // ============================================================
  function esCorreoValido(email) {
    if (!email) return true;

    const regexGeneral = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!regexGeneral.test(email)) return false;

    const reglas = {
      "gmail.com": ["gmail"],
      "yahoo.es": ["yahoo"],
      "hotmail.com": ["hotmail"],
      "outlook.com": ["outlook"],
      "live.com": ["live"],
      "icloud.com": ["icloud"]
    };

    const [usuario, dominioCompleto] = email.split("@");
    const partes = dominioCompleto.split(".");
    const proveedor = partes[0];
    const extension = partes.slice(1).join(".");
    const dominio = `${proveedor}.${extension}`;

    for (const dominioCorrecto in reglas) {
      if (reglas[dominioCorrecto].includes(proveedor)) {
        return dominio === dominioCorrecto;
      }
    }

    return true;
  }

  // ============================================================
  // BARRAS DE SEGURIDAD — 6 BARRAS
  // ============================================================
  const bars = document.querySelectorAll(".strength-bar");
  const barsContainer = document.getElementById("barsContainer");

  campos.password.addEventListener("input", () => {
    const v = campos.password.value.trim();

    // Reiniciar barras
    bars.forEach(b => b.className = "strength-bar");

    if (v.length === 0) {
      barsContainer.style.display = "none";
      return;
    }

    barsContainer.style.display = "flex";

    // Fuerza por niveles usando 6 barras
    if (v.length < 6) {
      // Muy débil → 1 barra
      bars[0].classList.add("active-weak");

    } else if (v.length < 10) {
      // Media → 3 barras
      bars[0].classList.add("active-medium");
      bars[1].classList.add("active-medium");
      bars[2].classList.add("active-medium");

    } else if (v.length < 14) {
      // Fuerte → 4 barras fuertes
      for (let i = 0; i < 4; i++) bars[i].classList.add("active-strong");

    } else if (v.length < 18) {
      // Muy fuerte → 5 barras
      for (let i = 0; i < 5; i++) bars[i].classList.add("active-strong");

    } else {
      // Ultra → 6 barras
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
  // VALIDACIÓN EN CADENA
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
