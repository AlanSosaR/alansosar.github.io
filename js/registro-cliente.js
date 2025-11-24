// ============================================================
// REGISTRO DE CLIENTE — VALIDACIÓN TIPO LOGIN (LABEL SUBE SIEMPRE)
// Error dentro si está vacío / error abajo si está lleno
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

  const btn = document.querySelector(".m3-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoader = btn.querySelector(".loader");

  // ============================================================
  // AÑADIR / QUITAR .filled AUTOMÁTICAMENTE
  // ============================================================
  Object.values(campos).forEach(input => {
    input.addEventListener("input", () => {
      const cont = input.closest(".m3-input");

      if (input.value.trim().length > 0) {
        cont.classList.add("filled");
      } else {
        cont.classList.remove("filled");
      }
    });
  });

  // ============================================================
  // LIMPIAR ERRORES
  // ============================================================
  function limpiarErrores() {
    document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error", "success"));
  }

  // ============================================================
  // MARCAR ERROR / SUCCESS — (LOGIN STYLE)
  // ============================================================
  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    const box = input.closest(".m3-input");
    const msg = box.parentElement.querySelector(".field-msg");

    if (success) {
      box.classList.remove("error");
      msg.style.opacity = "0";
      box.classList.add("success");
      return;
    }

    box.classList.add("error");

    // 📌 SI ESTÁ VACÍO → error DENTRO del input
    if (input.value.trim().length === 0) {
      msg.style.opacity = "0"; // No mostrar mensaje abajo
      input.placeholder = mensaje; // placeholder rojo
      return;
    }

    // 📌 SI TIENE TEXTO → error ABAJO (igual login)
    msg.textContent = mensaje;
    msg.style.opacity = "1";
  }

  // ============================================================
  // VALIDACIÓN CORREO
  // ============================================================
  const dominiosValidos = [
    "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com",
    "proton.me","live.com","msn.com","unah.hn","unah.edu",
    "gmail.es","correo.hn","googlemail.com","outlook.es","hotmail.es"
  ];

  const autocorrecciones = {
    "gmal.com":"gmail.com",
    "gmial.com":"gmail.com",
    "hotmai.com":"hotmail.com",
    "hotmal.com":"hotmail.com",
    "outlok.com":"outlook.com",
    "outllok.com":"outlook.com"
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

    return dominiosValidos.some(d => dominio.endsWith(d));
  }

  // ============================================================
  // VALIDACIÓN AUXILIAR
  // ============================================================
  const telefonoValido = t => /^[0-9]{7,15}$/.test(t.replace(/[\s-+]/g, ""));
  const passwordValida = p => p.length >= 6 && !p.includes(" ");

  // ============================================================
  // LOADER
  // ============================================================
  const activarLoading = () => {
    btn.classList.add("loading");
    btn.disabled = true;
    btnText.style.opacity = "0";
    btnLoader.style.display = "inline-block";
  };

  const desactivarLoading = () => {
    btn.classList.remove("loading");
    btn.disabled = false;
    btnText.style.opacity = "1";
    btnLoader.style.display = "none";
  };

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
  // SUBMIT FINAL
  // ============================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores();

    if (!validar()) return;

    activarLoading();

    try {
      await registerUser(
        campos.correo.value.trim(),
        campos.password.value.trim(),
        campos.telefono.value.trim(),
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
