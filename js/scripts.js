// ===============================
// SNACKBAR VISUAL – Café Cortero ☕
// ===============================

// Muestra un mensaje flotante temporal (estilo Material 3)
function mostrarSnackbar(mensaje) {
  const snackbar = document.getElementById("snackbar");
  if (!snackbar) return;

  snackbar.textContent = mensaje;
  snackbar.className = "show";

  // Ocultar después de 2 segundos
  setTimeout(() => {
    snackbar.className = snackbar.className.replace("show", "");
  }, 2000);
}
// === login-scripts.js ===
import "./firebase-config.js";
import "./firebase-auth.js";
import "./login.js";
import "./scripts.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Scripts del login cargados correctamente.");
});
