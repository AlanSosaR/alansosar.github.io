/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3
 * ---------------------------------------------------------
 * Vista de recibo (modo SOLO LECTURA).
 */

console.log("🧾 recibo.view.js — Cargado");

/* =========================================================
   INIT VIEW — SOLO CUANDO HAY ?id=
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  // 🔒 Protección: este archivo SOLO corre si estamos viendo un pedido existente
  if (!IS_READ_ONLY) {
    console.log("🛒 Modo checkout detectado, recibo.view.js en espera.");
    return;
  }

  (async function initView() {
    try {
      await esperarSupabase();

      const user = getUserCache();
      if (!user) {
        location.href = "login.html";
        return;
      }

      // 👁️ UI: Ocultar selectores de pago y botones de envío
      if (typeof aplicarModoRecibo === "function") {
        aplicarModoRecibo();
      }

      // 🧾 Cargar la información del pedido desde la DB
      await cargarPedidoExistente(ORDER_ID);

      // ⚡ Configurar la acción de Cancelar Pedido (Nueva)
      configurarAccionCancelar();

    } catch (err) {
      console.error("❌ Error en recibo.view.js:", err);
      if (typeof showSnack === "function") showSnack("Error al cargar el recibo");
    }
  })();
});

/* =========================================================
   LÓGICA DE CANCELACIÓN (ESPECÍFICA DE LA VISTA)
========================================================= */
function configurarAccionCancelar() {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    // Usamos el confirm del Core si existe, o un confirm nativo
    const confirmar = confirm("¿Estás seguro de que deseas cancelar este pedido?");
    
    if (confirmar) {
      try {
        const sb = window.supabaseClient;
        btnCancelar.disabled = true;
        btnCancelar.textContent = "Cancelando...";

        const { error } = await sb
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", ORDER_ID);

        if (error) throw error;

        // 🔄 Refrescar la UI: Recargar datos para que la píldora cambie a "Cancelado"
        if (typeof showSnack === "function") showSnack("Pedido cancelado correctamente");
        await cargarPedidoExistente(ORDER_ID);

      } catch (err) {
        console.error("Error al cancelar:", err);
        if (typeof showSnack === "function") showSnack("No se pudo cancelar el pedido");
        btnCancelar.disabled = false;
        btnCancelar.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
      }
    }
  };
}
