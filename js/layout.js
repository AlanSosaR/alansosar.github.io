// =====================================================
// LAYOUT — INYECTAR HEADER GLOBAL
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("app-header");
  if (!mount) return;

  fetch("partials/header.html")
    .then(res => res.text())
    .then(html => {
      mount.innerHTML = html;
    })
    .catch(err => console.error("Error cargando header:", err));
});
