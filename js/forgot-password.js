// ============================================================
// VAS-7 — Recuperación de contraseña Café Cortero ☕
// Soporte: correo O teléfono
// Validación estricta + verificación en Supabase
// ============================================================

const supabase = window.supabaseClient;

const form = document.getElementById("forgotForm");
const userInput = document.getElementById("recoverInput");

// Snackbar
function snackbar(msg) {
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2500);
}

// Marcar error visual al estilo M3
function marcarError(msg) {
  const box = userInput.closest(".m3-input");
  box.classList.add("error");

  userInput.value = "";
  userInput.placeholder = msg;
}

// Quitar error si escribe
userInput.addEventListener("input", () => {
  const box = userInput.closest(".m3-input");
  box.classList.remove("error");
  userInput.placeholder = "";
});

// ============================================================
// BUSCAR CORREO A PARTIR DEL TELÉFONO
// ============================================================
async function obtenerCorreoDesdeTelefono(tel) {
  const { data } = await supabase
    .from("users")
    .select("email")
    .eq("phone", tel)
    .limit(1);

  if (!data || data.length === 0) return null;
  return data[0].email; // puede ser automático o real
}

// ============================================================
// VALIDACIÓN BÁSICA
// ============================================================
function esCorreoValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  return regex.test(email);
}

// ============================================================
// SUBMIT – FLUJO PRINCIPAL
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const value = userInput.value.trim();

  if (!value) {
    marcarError("Ingresa tu correo o teléfono");
    return;
  }

  let correoFinal = value;

  // Caso: teléfono
  if (!value.includes("@")) {
    const correo = await obtenerCorreoDesdeTelefono(value);

    if (!correo) {
      marcarError("No encontramos esa cuenta");
      return;
    }

    correoFinal = correo;
  } else {
    // Caso: correo válido
    if (!esCorreoValido(value)) {
      marcarError("Correo inválido");
      return;
    }
  }

  // ============================================================
  // INTENTAR ENVIAR EL LINK DE RECUPERACIÓN
  // ============================================================
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(correoFinal, {
      redirectTo: window.location.origin + "/new-password.html"
    });

    if (error) {
      console.error(error);
      marcarError("No se pudo enviar el enlace");
      return;
    }

    snackbar("Enlace enviado al correo ✔");
    form.reset();

  } catch (err) {
    console.error(err);
    marcarError("Error inesperado");
  }
});
