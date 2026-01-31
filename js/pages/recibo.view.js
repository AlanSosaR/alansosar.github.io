/**
 * 🧾 recibo.view.js — CORREGIDO (Material 3 Expressive)
 * ---------------------------------------------------------
 */

console.log("🧾 recibo.view.js — Iniciando validación de dependencias");

document.addEventListener("DOMContentLoaded", () => {
  // 🔒 IS_READ_ONLY y ORDER_ID vienen del Core
  if (typeof IS_READ_ONLY === "undefined" || !IS_READ_ONLY) {
    console.log("🛒 Modo checkout detectado o variables core ausentes.");
    return;
  }

  (async function initView() {
    try {
      // ⏳ Esperar a que Supabase y las funciones del Core estén listas
      await esperarSupabase();

      // 🛠️ FIX: Verificar que getUserCache existe en el scope global
      const _getUserCache = window.getUserCache || (typeof getUserCache !== "undefined" ? getUserCache : null);
      
      if (!_getUserCache) {
        throw new Error("La función getUserCache no se encuentra cargada. Revisa el orden de los scripts.");
      }

      const user = _getUserCache();
      if (!user) {
        console.warn("Sesión no encontrada, redirigiendo...");
        location.href = "login.html";
        return;
      }

      // 👁️ UI: Aplicar modo lectura
      if (typeof window.aplicarModoRecibo === "function") {
        window.aplicarModoRecibo();
      }

      // 🧾 Cargar pedido
      if (typeof window.cargarPedidoExistente === "function") {
        await window.cargarPedidoExistente(ORDER_ID);
      }

      configurarAccionCancelar();

    } catch (err) {
      console.error("❌ Error crítico en recibo.view.js:", err.message);
      if (typeof showSnack === "function") showSnack("Error de conexión con el núcleo del sistema");
    }
  })();
});

function configurarAccionCancelar() {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    const confirmar = confirm("¿Deseas cancelar este pedido?");
    if (!confirmar) return;

    try {
      const sb = window.supabaseClient;
      btnCancelar.disabled = true;
      btnCancelar.textContent = "Procesando...";

      const { error } = await sb
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", ORDER_ID);

      if (error) throw error;

      if (typeof showSnack === "function") showSnack("Pedido cancelado");
      // Recargar datos para actualizar la píldora dinámica
      if (typeof window.cargarPedidoExistente === "function") {
        await window.cargarPedidoExistente(ORDER_ID);
      }

    } catch (err) {
      console.error("Error al cancelar:", err);
      btnCancelar.disabled = false;
      btnCancelar.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
    }
  };
}
