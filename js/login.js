// ========================================================
// LOGIN – Café Cortero ☕
// VALIDACIÓN + SESIÓN + PERFIL EN SESSIONSTORAGE
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
// FUNCIONES DE VALIDACIÓN
// ========================================================

function tipoDeEntrada(valor) {
  return /^[0-9]+$/.test(valor) ? "telefono" : "correo";
}

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
// LIMPIAR ERRORES
// ========================================================

function limpiarErroresInput(event) {
  const input = event.target;
  const field = input.closest(".m3-field");
  const box = field.querySelector(".m3-input");
  const msg = field.querySelector(".field-msg");

  box.classList.remove("error");
  msg.textContent = "";
  msg.style.opacity = "0";

  if (input.value.trim() !== "") {
    box.classList.add("success");
    input.classList.add("has-text");
    input.placeholder = "";
  } else {
    box.classList.remove("success");
    input.classList.remove("has-text");
    input.placeholder = " ";
  }
}

userInput.addEventListener("input", limpiarErroresInput);
passInput.addEventListener("input", limpiarErroresInput);

// ========================================================
// MARCAR ERROR
// ========================================================

function marcarError(input, placeholderText) {
  const field = input.closest(".m3-field");
  const box = field.querySelector(".m3-input");
  const msg = field.querySelector(".field-msg");

  box.classList.add("error");
  box.classList.remove("success");

  input.classList.add("has-text");
  input.placeholder = placeholderText;

  msg.textContent = placeholderText;
  msg.style.opacity = "1";
}

// ========================================================
// SUBMIT LOGIN
// ========================================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  if (!userValue) return marcarError(userInput, "Ingresa tu correo o teléfono");

  const tipo = tipoDeEntrada(userValue);

  if (tipo === "correo" && !validarCorreo(userValue))
    return marcarError(userInput, "Correo no válido");

  if (tipo === "telefono" && !validarTelefono(userValue))
    return marcarError(userInput, "Teléfono inválido");

  if (!passValue) return marcarError(passInput, "Ingresa tu contraseña");
  if (!validarPassword(passValue))
    return marcarError(passInput, "Contraseña no válida");

  loginBtn.classList.add("loading");
  btnText.style.opacity = "0";
  btnLoader.style.display = "inline-block";

  let emailToUse = userValue;

  try {
    // Si inicia con teléfono, buscar el email vinculado
    if (tipo === "telefono") {
      const { data: rows } = await supabase
        .from("users")
        .select("email")
        .eq("phone", userValue)
        .limit(1);

      if (!rows || rows.length === 0) {
        desactivarLoading();
        return marcarError(userInput, "Teléfono no registrado");
      }

      emailToUse = rows[0].email;
    }

    // --------------------------------------------------------
    // 🔥 LOGIN REAL
    // --------------------------------------------------------
    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passValue
    });

    if (error) {
      desactivarLoading();
      return marcarError(passInput, "Credenciales incorrectas");
    }

    // --------------------------------------------------------
    // 🔥 GUARDAR PERFIL PARA EL MENÚ (NUEVO SISTEMA)
    // --------------------------------------------------------
    try {
      const { data: perfiles, error: perfilError } = await supabase
        .from("users")
        .select("name, photo_url")
        .eq("email", emailToUse)
        .limit(1);

      if (!perfilError && perfiles && perfiles.length > 0) {
        const perfil = perfiles[0];
        sessionStorage.setItem("cortero_user", JSON.stringify(perfil));
      }
    } catch (err) {
      console.warn("No se pudo guardar el perfil:", err);
    }

    // Flag principal para auth-ui.js
    sessionStorage.setItem("cortero_logged", "1");

    // 🔥 Forzar actualización inmediata del menú
    if (window.__refreshMenuFromSession) {
      window.__refreshMenuFromSession();
    }

    mostrarSnackbar("Inicio de sesión exitoso ☕");

    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");

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
// DESACTIVAR LOADING
// ========================================================

function desactivarLoading() {
  loginBtn.classList.remove("loading");
  btnText.style.opacity = "1";
  btnLoader.style.display = "none";
}

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
