// ========================================================
// LOGIN – Café Cortero ☕
// Validación Gmail + Floating Label Real + Google Login
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
// LIMPIAR ERRORES AL ESCRIBIR
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
// SUBMIT LOGIN EMAIL
// ========================================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

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

  loginBtn.classList.add("loading");
  btnText.style.opacity = "0";
  btnLoader.style.display = "inline-block";

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

// ========================================================
// LOGIN CON GOOGLE (REDIRECCIÓN + TRIGGER FUNCIONANDO)
// ========================================================

document.getElementById("googleLoginBtn").addEventListener("click", async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://alansosar.github.io/index.html"
      }
    });

    if (error) {
      console.error(error);
      mostrarSnackbar("Error al conectar con Google");
    }

  } catch (err) {
    console.error(err);
    mostrarSnackbar("No se pudo iniciar con Google");
  }
});

// ========================================================
// 🔥 NECESARIO PARA QUE GOOGLE FUNCIONE
// Detectar sesión OAuth al volver a login.html
// ========================================================

async function detectarSesionGoogle() {
  const { data: { session } } = await supabase.auth.getSession();

  // Sesión existente → usuario ya logueado → trigger ya corrió → redirigir
  if (session) {
    console.log("Sesión detectada (Google):", session);
    window.location.href = "index.html";
    return;
  }

  // Escuchar nuevo login vía OAuth
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") {
      console.log("Google OAUTH completado:", session);
      window.location.href = "index.html";
    }
  });
}

detectarSesionGoogle();

// ========================================================
// BOTÓN ATRÁS
// ========================================================

const backBtn = document.querySelector(".back-btn");
if (backBtn) {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");

  backBtn.addEventListener("click", () => {
    if (from === "carrito") {
      window.location.href = "carrito.html";
      return;
    }
    window.location.href = "index.html";
  });
}
