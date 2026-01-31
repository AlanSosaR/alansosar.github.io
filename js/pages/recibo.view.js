/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3 (CORREGIDO)
 * ---------------------------------------------------------
 * Vista de recibo (modo SOLO LECTURA).
 */

console.log("🧾 recibo.view.js — Iniciando");

/* =========================================================
   INIT VIEW — SOLO CUANDO HAY ?id=
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  // 🔒 Usar window para asegurar que detectamos las variables del Core
  const isReadOnly = window.IS_READ_ONLY || Boolean(new URLSearchParams(window.location.search).get("id"));
  const orderId = window.ORDER_ID || new URLSearchParams(window.location.search).get("id");

  if (!isReadOnly) {
    console.log("🛒 Modo checkout detectado, recibo.view.js desactivado.");
    return;
  }

  (async function initView() {
    try {
      // ⏳ Esperar a que Supabase y el Core estén listos
      if (typeof window.esperarSupabase === "function") {
        await window.esperarSupabase();
      }

      // 🛠️ Validación de funciones críticas (Evita el ReferenceError)
      const _getUserCache = window.getUserCache || (typeof getUserCache !== "undefined" ? getUserCache : null);
      
      if (typeof _getUserCache !== "function") {
        console.error("❌ Error: getUserCache no está definido. Revisa el orden de los scripts.");
        return;
      }

      const user = _getUserCache();
      if (!user) {
        console.warn("🔐 Usuario no autenticado, redirigiendo...");
        location.href = "login.html";
        return;
      }

      // 👁️ UI: Aplicar modo recibo (ocultar elementos de edición)
      if (typeof window.aplicarModoRecibo === "function") {
        window.aplicarModoRecibo();
      }

      // 🧾 Cargar pedido desde Supabase
      if (typeof window.cargarPedidoExistente === "function") {
        await window.cargarPedidoExistente(orderId);
      }

      // ⚡ Configurar botón cancelar
      configurarAccionCancelar(orderId);

    } catch (err) {
      console.error("❌ Error crítico en recibo.view.js:", err);
      if (typeof window.showSnack === "function") window.showSnack("Error al cargar el recibo");
    }
  })();
});

/* =========================================================
   LÓGICA DE CANCELACIÓN (SINCRONIZADA CON CORE)
========================================================= */
function configurarAccionCancelar(orderId) {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    // Confirmación nativa o podrías usar un modal de Material 3
    const confirmar = confirm("¿Estás seguro de que deseas cancelar este pedido?");
    
    if (confirmar) {
      try {
        const sb = window.supabaseClient;
        if (!sb) throw new Error("Supabase no inicializado");

        btnCancelar.disabled = true;
        btnCancelar.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cancelando...`;

        const { error } = await sb
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        if (error) throw error;

        // 🔄 Refrescar la UI usando las funciones del Core
        if (typeof window.showSnack === "function") {
            window.showSnack("Pedido cancelado correctamente");
        }
        
        if (typeof window.cargarPedidoExistente === "function") {
            await window.cargarPedidoExistente(orderId);
        }

      } catch (err) {
        console.error("Error al cancelar:", err);
        if (typeof window.showSnack === "function") window.showSnack("No se pudo cancelar");
        btnCancelar.disabled = false;
        btnCancelar.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
      }
    }
  };
}
