// ========================================================
// LOGIN – Café Cortero ☕
// Validación avanzada estilo Gmail · Supabase Auth
// ========================================================

const supabase = window.supabaseClient;

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");
const loginBtn = document.querySelector(".m3-btn");
const btnText = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".loader");

// ========================================================
// REGLAS DE VALIDACIÓN
// ========================================================

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

// ========================================================
// LIMPIEZA DE ERRORES
// ========================================================

function limpiarErrores() {
  document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error"));
  document.querySelectorAll(".field-msg").forEach(msg => {
    msg.textContent = "";
    msg.style.opacity = "0";
  });
}

function marcarError(input, mensaje) {
  const group = input.closest(".m3-field");
  const msg = group.querySelector(".field-msg");

  group.querySelector(".m3-input").classList.add("error");
  msg.textContent = mensaje;
  msg.style.opacity = "1";
}

// ========================================================
// VALIDACIONES
// ========================================================

function validarCorreo(valor) {
  if (!valor.includes("@")) return false;

  const partes = valor.split("@");
  const dominio = partes[1].toLowerCase();

  if (autocorrecciones[dominio]) {
    userInput.value = partes[0] + "@" + autocorrecciones[dominio];
    return true;
  }

  if (!dominio.includes(".")) return false;

  return dominiosValidos.some(d => dominio.endsWith(d));
}

function validarTelefono(valor) {
  const limpio = valor.replace(/[\s-+]/g, "");
  if (!/^[0-9]+$/.test(limpio)) return false;
  return limpio.length >= 7 && limpio.length <= 15;
}

function validarPassword(valor) {
  if (valor.length < 6) return false;
  if (valor.includes(" ")) return false;
  if (["123456", "000000", "password"].includes(valor.toLowerCase())) return false;
  return true;
}

// ========================================================
// VALIDACIÓN EN VIVO (tipo Gmail)
// ========================================================

userInput.addEventListener("blur", () => {
  const v = userInput.value.trim();

  if (!v) return;

  if (v.includes("@") && !validarCorreo(v)) {
    marcarError(userInput, "Correo no válido");
  }

  if (!v.includes("@") && !validarTelefono(v)) {
    marcarError(userInput, "Teléfono inválido");
  }
});

userInput.addEventListener("input", limpiarErrores);
passInput.addEventListener("input", limpiarErrores);

// ========================================================
// LOADING INDICATOR
// ========================================================

function activarLoading() {
  loginBtn.classList.add("loading");
  btnText.style.opacity = "0";
  btnLoader.style.display = "inline-block";
}

function desactivarLoading() {
  loginBtn.classList.remove("loading");
  btnText.style.opacity = "1";
  btnLoader.style.display = "none";
}

// ========================================================
// DETECTAR FROM (carrito)
// ========================================================

const params = new URLSearchParams(window.location.search);
const from = params.get("from");

// ========================================================
// LOGIN PRINCIPAL
// ========================================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  limpiarErrores();

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  if (!userValue) {
    marcarError(userInput, "Ingresa tu correo o teléfono");
    return;
  }

  const esCorreo = userValue.includes("@");

  if (esCorreo && !validarCorreo(userValue)) {
    marcarError(userInput, "Correo no válido");
    return;
  }

  if (!esCorreo && !validarTelefono(userValue)) {
    marcarError(userInput, "Teléfono inválido");
    return;
  }

  if (!passValue) {
    marcarError(passInput, "Ingresa tu contraseña");
    return;
  }

  if (!validarPassword(passValue)) {
    marcarError(passInput, "Contraseña no válida");
    return;
  }

  activarLoading();

  let emailToUse = userValue;

  try {
    // Si usa teléfono → buscar email real
    if (!esCorreo) {
      const { data: rows } = await supabase
        .from("users")
        .select("email")
        .eq("phone", userValue)
        .limit(1);

      if (!rows || rows.length === 0) {
        desactivarLoading();
        marcarError(userInput, "Teléfono no registrado");
        return;
      }

      emailToUse = rows[0].email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passValue
    });

    if (error) {
      desactivarLoading();
      marcarError(passInput, "Credenciales incorrectas");
      return;
    }

    sessionStorage.setItem("cortero_logged", "1");

    mostrarSnackbar("Inicio de sesión exitoso ☕");

    setTimeout(() => {
      window.location.href =
        from === "carrito" ? "detalles-cliente.html" : "index.html";
    }, 1300);

  } catch (err) {
    console.error(err);
    desactivarLoading();
    marcarError(userInput, "Error al iniciar sesión");
  }
});

// ========================================================
// SNACKBAR
// ========================================================

function mostrarSnackbar(msg) {
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2600);
}

// ========================================================
// MOSTRAR / OCULTAR CONTRASEÑA
// ========================================================

document.querySelectorAll(".toggle-pass").forEach(icon => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);

    if (target.type === "password") {
      target.type = "text";
      icon.textContent = "visibility_off";
    } else {
      target.type = "password";
      icon.textContent = "visibility";
    }
  });
});

// ========================================================
// BOTÓN ATRÁS (flecha dentro de la tarjeta)
// ========================================================

const backBtn = document.querySelector(".back-btn");

if (backBtn) {
  backBtn.addEventListener("click", () => {
    if (from === "carrito") {
      window.location.href = "carrito.html";
      return;
    }
    window.location.href = "index.html";
  });
}
