// ===========================
// LOGIN.JS – Café Cortero ☕
// Supabase versión premium
// ===========================

const supabase = window.supabaseClient;

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");

// Guardamos placeholder original
document.querySelectorAll(".input-group input").forEach(input => {
  input.dataset.originalPlaceholder = input.placeholder;
});

function marcarError(input, mensaje) {
  const group = input.parentElement;
  group.classList.add("error");
  input.value = "";
  input.placeholder = mensaje;
}

function limpiarError(input) {
  const group = input.parentElement;
  group.classList.remove("error");
  input.placeholder = input.dataset.originalPlaceholder;
}

userInput.addEventListener("input", () => limpiarError(userInput));
passInput.addEventListener("input", () => limpiarError(passInput));

const params = new URLSearchParams(window.location.search);
const from = params.get("from");

// ===============================
// LOGIN
// ===============================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  limpiarError(userInput);
  limpiarError(passInput);

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  // =====================
  // VALIDACIONES
  // =====================
  if (!userValue) {
    marcarError(userInput, "Ingresa tu correo o teléfono");
    return;
  }

  if (!passValue) {
    marcarError(passInput, "Ingresa tu contraseña");
    return;
  }

  // =====================
  // OBTENER CORREO REAL
  // =====================
  let emailToUse = userValue;

  try {
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

    // ===========================
    // LOGIN CON SUPABASE AUTH
    // ===========================
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passValue
    });

    if (error) {
      console.error("Supabase login error:", error);

      if (error.message.includes("Invalid login credentials")) {
        marcarError(passInput, "Credenciales incorrectas");
      } else {
        marcarError(userInput, "Error al iniciar sesión");
      }
      return;
    }

    // ===========================
    // LOGIN ÉXITOSO
    // ===========================
    mostrarSnackbar("Inicio de sesión exitoso ☕ Bienvenido");

    setTimeout(() => {
      if (from === "carrito") {
        window.location.href = "detalles-cliente.html";
      } else {
        window.location.href = "index.html";
      }
    }, 1500);

  } catch (err) {
    console.error("Error inesperado:", err);
    marcarError(userInput, "Error al iniciar sesión");
  }
});

// ===============================
// SNACKBAR
// ===============================
function mostrarSnackbar(msg) {
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2600);
}
