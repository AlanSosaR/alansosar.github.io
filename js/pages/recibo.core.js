/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO SINCRONIZADO
 * ---------------------------------------------------------
 * Adaptado para Material 3 Expressive y Píldora de Estado
 */
console.log("🧾 recibo.core.js — Sincronizado con Material 3 Expressive");

const $id = (id) => document.getElementById(id);

/* =========================================================
   CONTEXTO
========================================================= */
window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   SNACKBAR M3
========================================================= */
function showSnack(msg, duration = 4000) {
  const bar = $id("snackbar");
  if (!bar) return;

  // Si tienes el span 'snack-text' en tu HTML:
  const textEl = bar.querySelector(".snack-text") || bar;
  textEl.textContent = msg;
  
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
}

/* =========================================================
   PROGRESO DEL PEDIDO — VERSIÓN M3 EXPRESSIVE
========================================================= */
function aplicarProgresoPedido(status, paymentMethod) {
  const pillContainer = $id("estado-pildora-container");
  const stepperContainer = document.querySelector(".progreso-bar");
  
  if (!pillContainer) return;

  // 1. Definir Mapeo de Estados
  const config = {
    pending: { label: "Pendiente", class: "status-pending", icon: "payments", step: 0 },
    payment_review: { label: "Revisando Pago", class: "status-review", icon: "fact_check", step: 1 },
    processing: { label: "Preparando", class: "status-processing", icon: "coffee", step: 2 },
    shipped: { label: "En Camino", class: "status-shipped", icon: "local_shipping", step: 3 },
    delivered: { label: "Entregado", class: "status-delivered", icon: "check_circle", step: 4 },
    cancelled: { label: "Cancelado", class: "status-cancelled", icon: "cancel", step: 0 }
  };

  const actual = config[status] || config.pending;

  // 2. Actualizar Píldora (HTML)
  pillContainer.innerHTML = `
    <div class="status-pill ${actual.class}">
      <span class="material-symbols-outlined">${actual.icon}</span>
      <span>${actual.label}</span>
    </div>
  `;

  // 3. Actualizar Barra de Progreso (Líneas y Círculos)
  if (stepperContainer) {
    const steps = document.querySelectorAll(".step");
    const lines = document.querySelectorAll(".line");

    // Reiniciar
    steps.forEach(s => s.style.background = "#e0e0e0");
    lines.forEach(l => l.style.background = "#e0e0e0");

    // Colorear según etapa (usando variables de color de tu CSS)
    const colorVerde = "#33673B";
    const colorMarron = "#512615";

    for (let i = 0; i < actual.step; i++) {
        if (steps[i]) steps[i].style.background = i === 0 ? colorMarron : colorVerde;
        if (lines[i]) lines[i].style.background = colorVerde;
    }
    if (steps[actual.step - 1]) steps[actual.step - 1].style.background = colorVerde;
  }
}

/* =========================================================
   CARGAR PEDIDO (Integrado con tu base de datos)
========================================================= */
async function cargarPedidoExistente(orderId) {
  if (!orderId) return;
  await window.esperarSupabase();
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      order_number, created_at, total, status, payment_method, order_notes,
      users(name, email, phone),
      addresses(state, city, street),
      order_items(quantity, price, products(name)),
      payment_receipts(file_url, created_at, review_status)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    showSnack("No pudimos encontrar tu pedido");
    return;
  }

  // Llenar Datos Generales
  if ($id("numeroPedido")) $id("numeroPedido").textContent = pedido.order_number;
  const fecha = new Date(pedido.created_at);
  if ($id("fechaPedido")) $id("fechaPedido").textContent = fecha.toLocaleDateString();
  if ($id("horaPedido")) $id("horaPedido").textContent = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  if ($id("notaCliente")) $id("notaCliente").textContent = pedido.order_notes || "Sin referencia";

  // Llenar Cliente
  if (pedido.users) {
    if ($id("nombreCliente")) $id("nombreCliente").textContent = pedido.users.name;
    if ($id("correoCliente")) $id("correoCliente").textContent = pedido.users.email;
    if ($id("telefonoCliente")) $id("telefonoCliente").textContent = pedido.users.phone;
  }

  // Llenar Productos (Adaptado al diseño de tarjeta)
  const lista = $id("listaProductos");
  if (lista) {
    lista.innerHTML = pedido.order_items.map(it => `
      <div class="cafe-item">
        <div>
          <span class="cafe-nombre">${it.products.name}</span>
          <div class="cafe-cantidad">Cant: <span class="cafe-qty">${it.quantity}</span></div>
        </div>
        <span class="cafe-precio">L ${(it.quantity * it.price).toFixed(2)}</span>
      </div>
    `).join("");
  }

  // Total
  if ($id("totalPedido")) $id("totalPedido").textContent = `L ${pedido.total.toFixed(2)}`;

  // Gestionar Visibilidad de Pago
  const pagoBloque = $id("pago-bloque-deposito");
  const preview = $id("previewComprobante");
  const img = $id("imgComprobante");

  if (pedido.payment_method === "bank_transfer") {
    pagoBloque?.classList.remove("hidden");
    if (pedido.payment_receipts?.length > 0) {
      const receipt = pedido.payment_receipts[0];
      if (preview && img) {
        preview.classList.remove("hidden");
        img.src = receipt.file_url;
      }
    }
  }

  // Determinar estado visual y aplicar a la Píldora
  let statusVisual = pedido.status;
  // Si es transferencia y hay recibo pero el pedido sigue "pending", mostrar como "En Revisión"
  if (pedido.payment_method === "bank_transfer" && pedido.status === "pending" && pedido.payment_receipts?.length > 0) {
    statusVisual = "payment_review";
  }

  aplicarProgresoPedido(statusVisual, pedido.payment_method);
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (window.IS_READ_ONLY) {
    aplicarModoRecibo();
    cargarPedidoExistente(window.ORDER_ID);
  }
});

function aplicarModoRecibo() {
  // Ocultar selector de pago y botones de acción de compra
  document.querySelector(".pago-select-label")?.classList.add("hidden");
  const btnEnviar = document.querySelector(".btn-primary");
  if (btnEnviar && !btnEnviar.classList.contains("btn-cancelar")) {
      btnEnviar.classList.add("hidden");
  }
}

// Helpers globales
window.esperarSupabase = () => new Promise(r => {
    if (window.supabaseClient) return r();
    const i = setInterval(() => { if (window.supabaseClient) { clearInterval(i); r(); } }, 100);
});
