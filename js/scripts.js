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

// Hacerla accesible globalmente
window.mostrarSnackbar = mostrarSnackbar;
