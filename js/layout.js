// =====================================================
// LAYOUT — INYECTAR HEADER GLOBAL (CORRECTO)
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("app-header");
  if (!mount) return;

  try {
    const res = await fetch("header.html"); // 🔑 RUTA CORRECTA
    if (!res.ok) throw new Error("Header no encontrado");

    const html = await res.text();
    mount.innerHTML = html;

  } catch (err) {
    console.error("❌ Error cargando header:", err);
  }
});
