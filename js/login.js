// ========================================================
// LOGIN – Café Cortero ☕
// Material 3 · Supabase Auth · Menú dinámico
// ========================================================

const supabase = window.supabaseClient;

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");

// ========================================================
// LIMPIAR ERRORES
// ========================================================
function limpiarErrores() {
  document.querySelectorAll(".m3-input").forEach(g => g.classList.remove("error"));
}

function marcarError(input, mensaje) {
  const group = input.closest(".m3-input");
  group.classList.add("error");

  input.value = "";
  input.placeholder = mensaje;
  setTimeout(() => (input.placeholder = ""), 2000);
}

userInput.addEventListener("input", () => limpiarErrores());
passInput.addEventListener("input", () => limpiarErrores());

// Detectar si viene de carrito
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

  // -----------------------------
  // Validaciones iniciales
  // -----------------------------
  if (!userValue) {
    marcarError(userInput, "Ingresa tu correo o teléfono");
    return;
  }

  if (!passValue) {
    marcarError(passInput, "Ingresa tu contraseña");
    return;
  }

  // -----------------------------
  // Interpretar correo o teléfono
  // -----------------------------
  let emailToUse = userValue;

  try {
    // Usuario inició con teléfono
    if (!userValue.includes("@")) {
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

    // -----------------------------
    // Login con Supabase Auth
    // -----------------------------
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passValue
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        marcarError(passInput, "Credenciales incorrectas");
      } else {
        marcarError(userInput, "Error al iniciar sesión");
      }
      return;
    }

    // -----------------------------
    // ACTUALIZAR EL MENÚ SUPERIOR
    // -----------------------------
    actualizarMenuUsuario();

    // -----------------------------
    // Login exitoso
    // -----------------------------
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
// FUNCIÓN PARA ACTIVAR MENÚ LOGUEADO
// ========================================================
async function actualizarMenuUsuario() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) return;

  localStorage.setItem("cortero_logged", "1");

  // El header real se actualizará desde core-scripts.js 
  // pero dejamos esta función por si se usa inmediatamente.
}

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
