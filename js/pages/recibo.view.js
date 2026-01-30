/**
 * recibo.view.js
 * ---------------------------------------------------------
 * Vista de recibo (modo SOLO LECTURA).
 *
 * RESPONSABILIDAD ÚNICA:
 * - Mostrar una orden ya creada
 *
 * NO hace:
 * - Crear pedidos
 * - Modificar datos
 * - Manejar pagos
 * - Validaciones de checkout
 *
 * Toda la lógica pesada vive en recibo.core.js
 */

console.log("🧾 recibo.view.js");

/* =========================================================
   INIT VIEW — SOLO CUANDO HAY ?id=
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  // 🔒 Protección: este archivo SOLO corre en modo vista
  if (!IS_READ_ONLY) {
    console.log("🛒 recibo.view.js desactivado (modo checkout)");
    return;
  }

  (async function initView() {
    try {
      // ⏳ Esperar a que Supabase esté listo
      await esperarSupabase();

      // 🔐 Validar sesión
      const user = getUserCache();
      if (!user) {
        console.warn("🔐 Usuario no autenticado, redirigiendo");
        location.href = "login.html";
        return;
      }

      // 👁️ Activar modo solo lectura (UI)
      if (typeof aplicarModoRecibo === "function") {
        aplicarModoRecibo();
      } else {
        console.warn("⚠️ aplicarModoRecibo no está definido");
      }

      // 📦 Validar función core
      if (typeof cargarPedidoExistente !== "function") {
        console.error("❌ cargarPedidoExistente no está disponible");
        showSnack?.("Error interno al cargar el pedido");
        return;
      }

      // 🧾 Cargar pedido
      await cargarPedidoExistente(ORDER_ID);

    } catch (err) {
      console.error("❌ Error en recibo.view.js:", err);
      showSnack?.("Error al cargar el recibo");
    }
  })();

});
