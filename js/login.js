// ========================================================
// LOGIN – Café Cortero ☕ (VERSIÓN FINAL ESTABLE)
// VALIDACIÓN + SESIÓN + PERFIL EN LOCALSTORAGE
// ========================================================

const sb = window.supabaseClient;

/* ========================= DOM ========================= */

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");
const loginBtn  = document.querySelector(".m3-btn");
const btnText   = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".loader");

/* ========================= DOMINIOS ========================= */

const dominiosValidos = [
  "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com",
  "proton.me","live.com","msn.com",
  "unah.hn","unah.edu","gmail.es","correo.hn",
  "googlemail.com","outlook.es","hotmail.es"
];

const autocorrecciones = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com"
};

/* ========================= VALIDACIONES ========================= */

function tipoDeEntrada(valor) {
  return /^[0-9]+$/.test(valor) ? "telefono" : "correo";
}

function validarCorreo(valor) {
  if (!valor.includes("@")) return false;

  const [user, dominioRaw] = valor.split("@");
  const dominio = dominioRaw?.toLowerCase();
  if (!dominio) return false;

  if (autocorrecciones[dominio]) {
    userInput.value = `${user}@${autocorrecciones[dominio]}`;
    return true;
  }

  return dominio.includes(".") && dominiosValidos.some(d => dominio.endsWith(d));
}

function validarTelefono(valor) {
  const limpio = valor.replace(/[\s-+]/g, "");
  return /^[0-9]{7,15}$/.test(limpio);
}

function validarPassword(valor) {
  return (
    valor.length >= 6 &&
    !valor.includes(" ") &&
    !["123456","000000","password"].includes(valor.toLowerCase())
  );
}

/* ========================= ERRORES UI ========================= */

function limpiarErroresInput(e) {
  const input = e.target;
  const field = input.closest(".m3-field");
  const box   = field.querySelector(".m3-input");
  const msg   = field.querySelector(".field-msg");

  box.classList.remove("error","success");
  msg.textContent = "";
  msg.style.opacity = "0";

  if (input.value.trim()) {
    box.classList.add("success");
    input.classList.add("has-text");
  } else {
    input.classList.remove("has-text");
  }
}

userInput.addEventListener("input", limpiarErroresInput);
passInput.addEventListener("input", limpiarErroresInput);

function marcarError(input, texto) {
  const field = input.closest(".m3-field");
  const box   = field.querySelector(".m3-input");
  const msg   = field.querySelector(".field-msg");

  box.classList.add("error");
  msg.textContent = texto;
  msg.style.opacity = "1";
}

/* ========================= LOGIN ========================= */

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  if (!userValue) return marcarError(userInput,"Ingresa tu correo o teléfono");

  const tipo = tipoDeEntrada(userValue);

  if (tipo === "correo" && !validarCorreo(userValue))
    return marcarError(userInput,"Correo no válido");

  if (tipo === "telefono" && !validarTelefono(userValue))
    return marcarError(userInput,"Teléfono inválido");

  if (!passValue)
    return marcarError(passInput,"Ingresa tu contraseña");

  if (!validarPassword(passValue))
    return marcarError(passInput,"Contraseña no válida");

  activarLoading();

  try {
    let emailFinal = userValue;

    /* --- Teléfono → buscar email real --- */
    if (tipo === "telefono") {
      const { data } = await sb
        .from("users")
        .select("email")
        .eq("phone", userValue)
        .single();

      if (!data) {
        desactivarLoading();
        return marcarError(userInput,"Teléfono no registrado");
      }

      emailFinal = data.email;
    }

    /* --- LOGIN REAL SUPABASE --- */
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailFinal,
      password: passValue
    });

    if (error) {
      desactivarLoading();
      return marcarError(passInput,"Credenciales incorrectas");
    }

    /* --- Guardar sesión real --- */
    if (data?.session) {
      localStorage.setItem("cortero-session", JSON.stringify(data.session));
    }

    /* --- Cargar perfil --- */
    const { data: perfil } = await sb
      .from("users")
      .select("id, name, email, phone, photo_url")
      .eq("email", emailFinal)
      .single();

    if (perfil) {
      localStorage.setItem("cortero_user", JSON.stringify(perfil));
      localStorage.setItem("cortero_logged", "1");
    }

    mostrarSnackbar("Inicio de sesión exitoso ☕");

    setTimeout(() => {
      const from = new URLSearchParams(location.search).get("from");
      location.href = from === "carrito"
        ? "detalles-cliente.html"
        : "index.html";
    }, 1200);

  } catch (err) {
    console.error("❌ Error login:", err);
    desactivarLoading();
    marcarError(userInput,"Error al iniciar sesión");
  }
});

/* ========================= UI ========================= */

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

function mostrarSnackbar(msg) {
  const s = document.getElementById("snackbar");
  if (!s) return;
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2600);
}

/* ========================= TOGGLE PASSWORD ========================= */

document.querySelectorAll(".toggle-pass").forEach(icon => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);
    const visible = target.type === "password";
    target.type = visible ? "text" : "password";
    icon.textContent = visible ? "visibility_off" : "visibility";
  });
});
