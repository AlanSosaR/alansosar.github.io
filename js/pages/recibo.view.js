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
   PROTECCIÓN — SOLO VISTA
   Si NO hay id en la URL, este archivo no hace nada
========================================================= */
if (!IS_READ_ONLY) {
  console.log("🛒 recibo.view.js desactivado (modo checkout)");
  return;
}

/* =========================================================
   INIT VIEW
========================================================= */
(async function initView() {
  // Esperar Supabase
  await esperarSupabase();

  // Validar sesión
  const user = getUserCache();
  if (!user) {
    location.href = "login.html";
    return;
  }

  // Activar modo solo lectura (oculta botones, inputs, etc.)
  aplicarModoRecibo();

  // Cargar y mostrar pedido existente
  await cargarPedidoExistente(ORDER_ID);
})();
