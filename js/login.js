// ========================================================  
// LOGIN – Café Cortero ☕  
// Material 3 · Supabase Auth · Validación Completa  
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

// Detectar si viene del carrito  
const params = new URLSearchParams(window.location.search);  
const from = params.get("from");  

// ========================================================
// VALIDACIONES AVANZADAS (correo / teléfono / password)  
// ========================================================

function validarCorreo(valor) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(valor);
}

function validarTelefono(valor) {
  const regex = /^\+?[0-9\s\-]{7,15}$/;
  return regex.test(valor);
}

function validarPassword(valor) {
  return valor.length >= 6;
}

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

  // Detectar tipo de usuario
  let esCorreo = userValue.includes("@");

  // -----------------------------  
  // Validación de correo  
  // -----------------------------  
  if (esCorreo && !validarCorreo(userValue)) {  
    marcarError(userInput, "Correo no válido");  
    return;  
  }

  // -----------------------------  
  // Validación de teléfono  
  // -----------------------------  
  if (!esCorreo && !validarTelefono(userValue)) {
    marcarError(userInput, "Teléfono inválido");
    return;
  }

  // -----------------------------  
  // Validación de contraseña  
  // -----------------------------  
  if (!passValue) {  
    marcarError(passInput, "Ingresa tu contraseña");  
    return;  
  }

  if (!validarPassword(passValue)) {
    marcarError(passInput, "Mínimo 6 caracteres");
    return;
  }

  // -----------------------------  
  // Interpretar correo o teléfono  
  // -----------------------------  
  let emailToUse = userValue;  

  try {  
    // Caso: login con TELÉFONO  
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

    // -----------------------------  
    // Login con Supabase Auth  
    // -----------------------------  
    const { data, error } = await supabase.auth.signInWithPassword({  
      email: emailToUse,  
      password: passValue  
    });  

    if (error) {  
      marcarError(passInput, "Credenciales incorrectas");
      return;  
    }  

    // -----------------------------  
    // Guardar estado de login (GitHub Pages FIX)  
    // -----------------------------  
    sessionStorage.setItem("cortero_logged", "1");  

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
