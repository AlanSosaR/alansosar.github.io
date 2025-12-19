// =====================================================
// LAYOUT — INYECTAR HEADER GLOBAL (SIN WRAPPER HEREDADO)
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("header.html"); // ruta correcta
    if (!res.ok) throw new Error("Header no encontrado");

    const html = await res.text();

    // 🔑 Inyectar directamente en <body>
    document.body.insertAdjacentHTML("afterbegin", html);

  } catch (err) {
    console.error("❌ Error cargando header:", err);
  }
});
