// ============================================================
// REGISTRO DE CLIENTE — VALIDACIÓN TIPO GMAIL
// Label sube y muestra error igual que Login
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
  // MARCAR ERROR / ÉXITO — versión Login aplicada a Registro
  // ============================================================
  function marcar(campo, mensaje, success = false) {
    const input = campos[campo];
    const box = input.closest(".m3-input");
    const label = box.querySelector(".floating-label");
    const msg = box.parentElement.querySelector(".field-msg");

    // Reset mensaje
    msg.style.opacity = "0";
    msg.textContent = "";

    // ================================
    // ✔️ SUCCESS
    // ================================
    if (success) {
      box.classList.remove("error");
      box.classList.add("success");

      label.style.top = "-6px";
      label.style.left = "12px";
      label.style.fontSize = "0.75rem";
      label.style.color = "#33673B";
      label.style.background = "#fff";
      label.style.padding = "0 4px";

      return;
    }

    // ================================
    // ❌ ERROR
    // ================================
    box.classList.add("error");

    // ------------------------------
    // SI ESTÁ VACÍO → error ARRIBA (igual Login)
    // ------------------------------
    if (input.value.trim().length === 0) {
      label.textContent = mensaje;
      label.style.top = "-6px";
      label.style.left = "12px";
      label.style.fontSize = "0.75rem";
      label.style.color = "#D32F2F";
      label.style.background = "#fff";
      label.style.padding = "0 4px";
      return;
    }

    // ------------------------------
    // SI TIENE TEXTO → error ABAJO
    // ------------------------------
    msg.textContent = mensaje;
    msg.style.opacity = "1";

    label.style.top = "-6px";
    label.style.left = "12px";
    label.style.fontSize = "0.75rem";
    label.style.color = "#D32F2F";
    label.style.background = "#fff";
    label.style.padding = "0 4px";
  }

  // ============================================================
  // LIMPIAR ERRORES
  // ============================================================
  function limpiarErrores() {
    document.querySelectorAll(".m3-input").forEach(c => c.classList.remove("error", "success"));
    document.querySelectorAll(".field-msg").forEach(m => { m.textContent = ""; m.style.opacity = "0"; });
  }

  // ============================================================
  // VALIDACIÓN AVANZADA CORREO
  // ============================================================
  const dominiosValidos = [
    "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com",
    "proton.me","live.com","msn.com",
    "unah.hn","unah.edu","gmail.es","correo.hn",
    "googlemail.com","outlook.es","hotmail.es"
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
  // VALIDACIONES GENERALES
  // ============================================================
  function telefonoValido(t) {
    return /^[0-9]{7,15}$/.test(t.replace(/[\s-+]/g, ""));
  }

  function passwordValida(p) {
    return p.length >= 6 && !p.includes(" ");
  }

  // ============================================================
  // LOADER
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
  // SUBMIT
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
