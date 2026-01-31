/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3
 * ---------------------------------------------------------
 * Vista de recibo (modo SOLO LECTURA).
 */

console.log("🧾 recibo.view.js — Iniciando");

document.addEventListener("DOMContentLoaded", () => {

  /**
   * 🔒 SEGURIDAD DE CONTEXTO
   * Usamos window para asegurar acceso a las variables definidas en el Core.
   */
  const orderId = window.ORDER_ID || new URLSearchParams(window.location.search).get("id");
  const isReadOnly = window.IS_READ_ONLY || Boolean(orderId);

  if (!isReadOnly) {
    console.log("🛒 Modo checkout detectado, recibo.view.js en espera.");
    return;
  }

  (async function initView() {
    try {
      // ⏳ 1. Esperar a que Supabase y el Core estén listos
      if (typeof window.esperarSupabase === "function") {
        await window.esperarSupabase();
      }

      // 🔐 2. VALIDACIÓN DE SESIÓN (Con reintentos inteligentes)
      let user = null;
      let intentos = 0;

      // Intentamos obtener el usuario hasta 5 veces (pausas de 100ms) 
      // para dar tiempo a que localStorage se lea correctamente.
      while (!user && intentos < 5) {
        if (typeof window.getUserCache === "function") {
          user = window.getUserCache();
        }
        if (user) break;
        await new Promise(r => setTimeout(r, 100));
        intentos++;
      }

      if (!user) {
        console.warn("🔐 Sesión no válida, redirigiendo a login.");
        location.href = "login.html";
        return;
      }

      // 👁️ 3. UI: Aplicar modo recibo (Ocultar selectores y botones de envío)
      if (typeof window.aplicarModoRecibo === "function") {
        window.aplicarModoRecibo();
      }

      // 🧾 4. CARGAR DATOS: Invocamos la lógica pesada del Core
      if (typeof window.cargarPedidoExistente === "function") {
        await window.cargarPedidoExistente(orderId);
      } else {
        throw new Error("La función cargarPedidoExistente no está disponible.");
      }

      // ⚡ 5. ACCIONES: Configurar botón de cancelación si existe
      configurarAccionCancelar(orderId);

    } catch (err) {
      console.error("❌ Error en initView:", err);
      if (typeof window.showSnack === "function") {
        window.showSnack("Error crítico al cargar el recibo");
      }
    }
  })();
});

/* =========================================================
   LÓGICA DE CANCELACIÓN (ESPECÍFICA DE LA VISTA)
========================================================= */
function configurarAccionCancelar(orderId) {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    // Confirmación nativa (puedes cambiarla por un diálogo M3)
    if (!confirm("¿Estás seguro de que deseas cancelar este pedido?")) return;

    try {
      const sb = window.supabaseClient;
      if (!sb) return;

      btnCancelar.disabled = true;
      btnCancelar.innerHTML = `<span class="material-symbols-outlined fa-spin">autorenew</span> Cancelando...`;

      const { error } = await sb
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      // Éxito: Feedback y recarga de datos visuales
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
  };
}
