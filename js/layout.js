// =====================================================
// LAYOUT — INYECTAR HEADER GLOBAL (CORE FINAL)
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("header.html");
    if (!res.ok) throw new Error("Header no encontrado");

    const html = await res.text();

    // 🔑 Inyectar header
    document.body.insertAdjacentHTML("afterbegin", html);

    // 🔑 INICIALIZAR HEADER (OBLIGATORIO)
    if (typeof initHeader === "function") {
      initHeader();
    } else {
      console.error("❌ initHeader() no está disponible");
    }

  } catch (err) {
    console.error("❌ Error cargando header:", err);
  }
});
