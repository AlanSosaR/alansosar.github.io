// ========================================================
// LOGIN – Café Cortero ☕
// Validación estilo Gmail · Supabase Auth
// ========================================================

const supabase = window.supabaseClient;

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");
const loginBtn = document.querySelector(".m3-btn");
const btnText = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".loader");

// ========================================================
// DOMINIOS + AUTOCORRECCIONES
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
// TIPO DE ENTRADA
// ========================================================

function tipoDeEntrada(valor) {
  return /^[0-9]+$/.test(valor) ? "telefono" : "correo";
}

// ========================================================
// LIMPIAR ERRORES
// ========================================================

function limpiarErrores() {
  document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error"));
  document.querySelectorAll(".field-msg").forEach(msg => {
    msg.textContent = "";
    msg.style.opacity = "0";
  });

  // Restaurar placeholder vacío
  userInput.placeholder = " ";
  passInput.placeholder = " ";

  // Quitar clases de error/estado
  userInput.classList.remove("has-text");
  passInput.classList.remove("has-text");
}

// ========================================================
// NUEVA FUNCIÓN — CORREGIDA (FLOATING-LABEL PERFECTO)
// ========================================================

function marcarError(input, mensaje) {
  const group = input.closest(".m3-field");
  const msg = group.querySelector(".field-msg");
  const m3 = group.querySelector(".m3-input");

  // Añadir borde rojo
  m3.classList.add("error");

  // --------- CASO 1: CAMPO VACÍO ---------
  if (input.value.trim() === "") {
    input.placeholder = " "; // placeholder SIEMPRE vacío
    msg.textContent = mensaje;
    msg.style.opacity = "1";

    // label NO flota
    input.classList.remove("has-text");
    return;
  }

  // --------- CASO 2: CAMPO CON TEXTO PERO ERROR ---------
  input.classList.add("has-text");

  msg.textContent = mensaje;
  msg.style.opacity = "1";
}

// ========================================================
// VALIDACIONES
// ========================================================

function validarCorreo(valor) {
  if (!valor.includes("@")) return false;

  const partes = valor.split("@");
  const dominio = partes[1]?.toLowerCase();
  if (!dominio) return false;

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
// VALIDACIÓN EN VIVO
// ========================================================

userInput.addEventListener("blur", () => {
  const v = userInput.value.trim();
  if (!v) return;

  const tipo = tipoDeEntrada(v);

  if (tipo === "correo" && !validarCorreo(v)) {
    marcarError(userInput, "Correo no válido");
  }

  if (tipo === "telefono" && !validarTelefono(v)) {
    marcarError(userInput, "Teléfono inválido");
  }
});

userInput.addEventListener("input", limpiarErrores);
passInput.addEventListener("input", limpiarErrores);

// ========================================================
// LOADING
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
// DETECTAR "from=carrito"
// ========================================================

const params = new URLSearchParams(window.location.search);
const from = params.get("from");

// ========================================================
// LOGIN
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

  const tipo = tipoDeEntrada(userValue);

  if (tipo === "correo" && !validarCorreo(userValue)) {
    marcarError(userInput, "Correo no válido");
    return;
  }

  if (tipo === "telefono" && !validarTelefono(userValue)) {
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
    if (tipo === "telefono") {
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
// TOGGLE PASSWORD
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
// BOTÓN ATRÁS
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
