/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3 EXPRESSIVE
 * ---------------------------------------------------------
 * Vista de recibo (modo SOLO LECTURA).
 */

console.log("🧾 recibo.view.js — Iniciando");

document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. Obtener ID de la URL inmediatamente
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  // Si no hay ID, no es un recibo válido, volvemos a mis pedidos
  if (!orderId) {
    console.warn("⚠️ No se encontró ID de pedido.");
    return; 
  }

  try {
    // ⏳ 2. ESPERA CRÍTICA: Esperar a que Supabase y el Core carguen
    // Si la función no existe aún, esperamos un poco
    if (typeof window.esperarSupabase !== "function") {
      await new Promise(r => {
        const check = setInterval(() => {
          if (typeof window.esperarSupabase === "function") {
            clearInterval(check);
            r();
          }
        }, 50);
      });
    }
    
    await window.esperarSupabase();

    // 🔐 3. VALIDACIÓN DE SESIÓN (Evitar falsos negativos)
    let user = null;
    if (typeof window.getUserCache === "function") {
      user = window.getUserCache();
    }

    // Si después de esperar al Core no hay usuario, entonces sí redirigimos
    if (!user) {
      console.warn("🔐 Sesión no válida en View, redirigiendo...");
      // Solo redirigir si no estamos ya en login para evitar bucles
      if (!window.location.pathname.includes("login.html")) {
        window.location.href = "login.html";
      }
      return;
    }

    // 👁️ 4. UI: Preparar interfaz para lectura
    if (typeof window.aplicarModoRecibo === "function") {
      window.aplicarModoRecibo();
    }

    // 🧾 5. CARGAR DATOS
    if (typeof window.cargarPedidoExistente === "function") {
      await window.cargarPedidoExistente(orderId);
    }

    // ⚡ 6. ACCIONES: Botón cancelar
    configurarAccionCancelar(orderId);

  } catch (err) {
    console.error("❌ Error en initView:", err);
    if (window.showSnack) window.showSnack("Error al conectar con el servidor");
  }
});

/* =========================================================
   LÓGICA DE CANCELACIÓN (MEJORADA)
========================================================= */
async function configurarAccionCancelar(orderId) {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    // Usar el snackbar para confirmación si es posible, o confirm nativo
    const confirmar = confirm("¿Deseas cancelar este pedido? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error("Supabase no disponible");

      // UI State: Deshabilitar para evitar doble clic
      btnCancelar.disabled = true;
      const originalHTML = btnCancelar.innerHTML;
      btnCancelar.innerHTML = `<span class="material-symbols-outlined fa-spin">autorenew</span> Procesando...`;

      const { error } = await sb
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      if (window.showSnack) window.showSnack("Pedido cancelado correctamente");
      
      // Recargar datos para actualizar la píldora de estado y ocultar el botón
      if (window.cargarPedidoExistente) {
        await window.cargarPedidoExistente(orderId);
      }
      
      // Ocultar el botón después de cancelar
      btnCancelar.classList.add("hidden");

    } catch (err) {
      console.error("Error al cancelar:", err);
      if (window.showSnack) window.showSnack("Error: No se pudo cancelar");
      btnCancelar.disabled = false;
      btnCancelar.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
    }
  };
}
