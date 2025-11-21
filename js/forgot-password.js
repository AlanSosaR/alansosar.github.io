// ============================================================
// VAS-7 — Recuperación de contraseña Café Cortero ☕
// Flujo completo: correo real / correo genérico / teléfono
// Validación estricta + Supabase
// ============================================================

const supabase = window.supabaseClient;

const form = document.getElementById("forgotForm");
const userInput = document.getElementById("recoverInput");

// ------------------------------------------------------------
// SNACKBAR
// ------------------------------------------------------------
function snackbar(msg) {
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2500);
}

// ------------------------------------------------------------
// MARCAR ERROR VISUAL
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// VALIDACIÓN DE CORREO
// ------------------------------------------------------------
function esCorreoValido(email) {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email);
}

// ------------------------------------------------------------
// OBTENER USUARIO POR CORREO O TELÉFONO
// ------------------------------------------------------------
async function obtenerUsuario(valor) {
  const columna = valor.includes("@") ? "email" : "phone";

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq(columna, valor)
    .limit(1);

  return data && data.length > 0 ? data[0] : null;
}

// ------------------------------------------------------------
// GUARDAR PIN PARA USUARIO SIN CORREO REAL
// ------------------------------------------------------------
async function generarPIN(usuario) {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  await supabase.from("password_reset_codes").insert({
    user_id: usuario.id,
    phone: usuario.phone,
    pin: pin,
    created_at: new Date().toISOString()
  });

  return pin;
}

// ------------------------------------------------------------
// SUBMIT — FLUJO PRINCIPAL
// ------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const valor = userInput.value.trim();

  if (!valor) {
    marcarError("Ingresa tu correo o teléfono");
    return;
  }

  // Buscar usuario
  const usuario = await obtenerUsuario(valor);

  if (!usuario) {
    marcarError("No encontramos esa cuenta");
    return;
  }

  const correo = usuario.email;

  // ============================================================
  // CASO 1 — CORREO REAL (flujo B2)
  // ============================================================
  if (!correo.startsWith("auto-")) {
    if (!esCorreoValido(correo)) {
      marcarError("Correo inválido");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: window.location.origin + "/new-password.html"
      });

      if (error) {
        console.error(error);
        marcarError("No se pudo enviar el enlace");
        return;
      }

      // Guardamos correo para pantalla “correo enviado”
      localStorage.setItem("cortero_recovery_email", correo);

      // Ir a pantalla B2
      window.location.href = "correo-enviado.html";
      return;

    } catch (err) {
      console.error(err);
      marcarError("Error inesperado");
      return;
    }
  }

  // ============================================================
  // CASO 2 — CORREO GENÉRICO (flujo B1 → PIN por SMS)
  // ============================================================
  const pin = await generarPIN(usuario);

  // Guardamos el teléfono para la pantalla validar-pin
  localStorage.setItem("cortero_recovery_phone", usuario.phone);

  // Ir a pantalla B1
  window.location.href = "validar-pin.html";
});
