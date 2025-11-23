// ========================================================
// LOGIN – Café Cortero ☕
// Validación avanzada estilo Gmail · Supabase Auth
// ========================================================

const supabase = window.supabaseClient;

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");

// ========================================================
// REGLAS DE VALIDACIÓN
// ========================================================

// Dominios reales aceptados
const dominiosValidos = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com",
  "proton.me", "live.com", "msn.com",
  "unah.hn", "unah.edu", "gmail.es", "correo.hn",
  "googlemail.com", "outlook.es", "hotmail.es",
  "co", "com", "net", "org", "edu", "gov"
];

// Correcciones automáticas
const autocorrecciones = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com"
};

// ========================================================
// LIMPIAR ERRORES
// ========================================================
function limpiarErrores() {
  document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error"));
  document.querySelectorAll(".field-msg").forEach(msg => msg.textContent = "");
}

function marcarError(input, mensaje) {
  const group = input.closest(".m3-field");
  const msg = group.querySelector(".field-msg");

  group.querySelector(".m3-input").classList.add("error");
  msg.textContent = mensaje;
}

// ========================================================
// VALIDACIONES
// ========================================================

// CORREO
function validarCorreo(valor) {
  if (!valor.includes("@")) return false;

  const partes = valor.split("@");
  if (partes.length !== 2) return false;

  const dominio = partes[1].toLowerCase();

  // Autocorrecciones
  if (autocorrecciones[dominio]) {
    userInput.value = partes[0] + "@" + autocorrecciones[dominio];
    return true;
  }

  // Validación estricta
  if (!dominio.includes(".")) return false;

  return dominiosValidos.some(d => dominio.endsWith(d));
}

// TELÉFONO
function validarTelefono(valor) {
  const limpio = valor.replace(/[\s-+]/g, "");

  if (!/^[0-9]+$/.test(limpio)) return false;
  if (limpio.length < 7 || limpio.length > 15) return false;

  return true;
}

// PASSWORD
function validarPassword(valor) {
  if (valor.length < 6) return false;
  if (valor.includes(" ")) return false;
  if (["123456", "000000", "password"].includes(valor.toLowerCase())) return false;

  return true;
}

// ========================================================
// DETECTAR SI VIENE DEL CARRITO
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

  // -----------------------------------
  // Validación: Campo vacío
  // -----------------------------------
  if (!userValue) {
    marcarError(userInput, "Ingresa tu correo o teléfono");
    return;
  }

  const esCorreo = userValue.includes("@");

  // -----------------------------------
  // VALIDAR CORREO
  // -----------------------------------
  if (esCorreo && !validarCorreo(userValue)) {
    marcarError(userInput, "Correo no válido");
    return;
  }

  // -----------------------------------
  // VALIDAR TELÉFONO
  // -----------------------------------
  if (!esCorreo && !validarTelefono(userValue)) {
    marcarError(userInput, "Teléfono inválido");
    return;
  }

  // -----------------------------------
  // VALIDAR CONTRASEÑA
  // -----------------------------------
  if (!passValue) {
    marcarError(passInput, "Ingresa tu contraseña");
    return;
  }

  if (!validarPassword(passValue)) {
    marcarError(passInput, "Contraseña no válida");
    return;
  }

  let emailToUse = userValue;

  try {

    // -----------------------------------
    // LOGIN CON TELÉFONO
    // -----------------------------------
    if (!esCorreo) {
      const { data: rows, error: phoneError } = await supabase
        .from("users")
        .select("email")
        .eq("phone", userValue)
        .limit(1);

      if (phoneError || !rows || rows.length === 0) {
        marcarError(userInput, "Teléfono no registrado");
        return;
      }

      emailToUse = rows[0].email;
    }

    // -----------------------------------
    // LOGIN SUPABASE
    // -----------------------------------
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passValue
    });

    if (error) {
      marcarError(passInput, "Credenciales incorrectas");
      return;
    }

    // Guardar sesión
    sessionStorage.setItem("cortero_logged", "1");

    // Éxito
    mostrarSnackbar("Inicio de sesión exitoso ☕");

    setTimeout(() => {
      if (from === "carrito") {
        window.location.href = "detalles-cliente.html";
      } else {
        window.location.href = "index.html";
      }
    }, 1400);

  } catch (err) {
    console.error("Error inesperado:", err);
    marcarError(userInput, "Error al iniciar sesión");
  }
});

// ========================================================
// SNACKBAR
// ========================================================
function mostrarSnackbar(msg) {
  const s = document.getElementById("snackbar");
  if (!s) return;

  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2600);
}

// ========================================================
// MOSTRAR / OCULTAR PASSWORD
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
