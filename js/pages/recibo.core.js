/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO SINCRONIZADO
 * ---------------------------------------------------------
 * Proyecto: Café Cortero — Material 3 Expressive
 */

console.log("🧾 recibo.core.js — Optimizado");

/* =========================================================
   1. SELECTORES Y CONTEXTO GLOBAL
========================================================= */
const $id = (id) => document.getElementById(id);

window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   2. NÚCLEO DE DATOS Y SESIÓN
========================================================= */

window.esperarSupabase = () => {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const intervalo = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(intervalo);
        resolve();
      }
    }, 50);
  });
};

window.getUserCache = () => {
  try {
    const user = localStorage.getItem("cortero_user");
    if (user) return JSON.parse(user);
    const sbKey = Object.keys(localStorage).find(k => k.includes("-auth-token"));
    if (sbKey) {
      const session = JSON.parse(localStorage.getItem(sbKey));
      return session?.user || null;
    }
    return null;
  } catch (err) { return null; }
};

window.showSnack = (msg, duration = 4000) => {
  const bar = $id("snackbar");
  if (!bar) return;
  const textEl = bar.querySelector(".snack-text") || bar;
  textEl.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
};

/* =========================================================
   3. GESTIÓN DE INTERFAZ (Píldora y Cancelar)
========================================================= */

window.aplicarModoRecibo = () => {
  const btnBack = $id("btn-back");
  if (btnBack) btnBack.onclick = () => window.location.href = "mis-pedidos.html";

  document.querySelector(".pago-select-label")?.classList.add("hidden");
  
  const btnCancelar = $id("btnCancelarPedido") || document.querySelector(".btn-cancelar");
  if (btnCancelar) {
    btnCancelar.onclick = (e) => {
      e.preventDefault();
      confirmarCancelacionM3();
    };
  }
};

function confirmarCancelacionM3() {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; width:100%;">
      <span class="snack-text">¿Deseas cancelar este pedido?</span>
      <div style="display:flex; gap:8px; justify-content: flex-end;">
        <button onclick="$id('snackbar').classList.remove('show')" style="background:none; border:none; color:#fff; font-weight:600; cursor:pointer; padding:8px;">No</button>
        <button id="confirm-cancel-btn" style="background:#ff4436; border:none; color:#fff; font-weight:600; cursor:pointer; padding:8px 16px; border-radius:8px;">Sí, Cancelar</button>
      </div>
    </div>
  `;
  bar.classList.add("show");

  $id("confirm-cancel-btn").onclick = async () => {
    bar.classList.remove("show");
    await ejecutarCancelacion();
  };
}

async function ejecutarCancelacion() {
  const sb = window.supabaseClient;
  const { error } = await sb.from("orders").update({ status: 'cancelled' }).eq("id", window.ORDER_ID);
  
  if (error) {
    window.showSnack("Error al cancelar el pedido");
  } else {
    window.showSnack("Pedido cancelado correctamente");
    setTimeout(() => location.reload(), 1500);
  }
}

window.aplicarProgresoPedido = (status) => {
  const pillContainer = $id("estado-pildora-container");
  if (!pillContainer) return;

  const config = {
    pending: { label: "Pendiente", class: "status-pending", icon: "payments" },
    payment_review: { label: "Revisando Pago", class: "status-review", icon: "fact_check" },
    processing: { label: "En Preparación", class: "status-processing", icon: "coffee" },
    shipped: { label: "En Camino", class: "status-shipped", icon: "local_shipping" },
    delivered: { label: "Entregado", class: "status-delivered", icon: "check_circle" },
    cancelled: { label: "Cancelado", class: "status-cancelled", icon: "cancel" }
  };

  const actual = config[status] || config.pending;
  pillContainer.innerHTML = `
    <div class="status-pill ${actual.class}">
      <span class="material-symbols-outlined">${actual.icon}</span>
      <span>${actual.label}</span>
    </div>
  `;
};

/* =========================================================
   4. CARGA DE DATOS DESDE SUPABASE
========================================================= */

window.cargarPedidoExistente = async (orderId) => {
  if (!orderId) return;
  await window.esperarSupabase();
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      *,
      users(name, email, phone),
      addresses(state, city, street),
      order_items(quantity, price, products(name)),
      payment_receipts(file_url)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    window.showSnack("Error: No se encontró el pedido");
    return;
  }

  // 1. Cabecera y Tiempos
  if ($id("numeroPedido")) $id("numeroPedido").textContent = pedido.order_number;
  const fecha = new Date(pedido.created_at);
  if ($id("fechaPedido")) $id("fechaPedido").textContent = fecha.toLocaleDateString();
  if ($id("horaPedido")) $id("horaPedido").textContent = fecha.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  if ($id("totalPedido")) $id("totalPedido").textContent = pedido.total.toFixed(2);
  if ($id("notaCliente")) $id("notaCliente").textContent = pedido.order_notes || "Sin referencia";

  // 2. Datos del Cliente y Dirección (Zona y Detalle corregidos)
  if (pedido.users) {
    if ($id("nombreCliente")) $id("nombreCliente").textContent = pedido.users.name;
    if ($id("correoCliente")) $id("correoCliente").textContent = pedido.users.email;
    if ($id("telefonoCliente")) $id("telefonoCliente").textContent = pedido.users.phone;
  }
  
  if (pedido.addresses) {
    if ($id("zonaCliente")) $id("zonaCliente").textContent = `${pedido.addresses.state}, ${pedido.addresses.city}`;
    if ($id("direccionCliente")) $id("direccionCliente").textContent = pedido.addresses.street;
  }

  // 3. Productos e Imagen
  const lista = $id("listaProductos");
  if (lista) {
    lista.innerHTML = pedido.order_items.map(it => `
      <div class="cafe-item">
        <div class="cafe-info-main"><span class="cafe-nombre">${it.products.name} (${it.quantity})</span></div>
        <span class="cafe-precio">L ${(it.quantity * it.price).toFixed(2)}</span>
      </div>`).join("");
  }

  const preview = $id("previewComprobante");
  const img = $id("imgComprobante");
  if (pedido.payment_method === "bank_transfer" && preview && img) {
    preview.classList.remove("hidden");
    const tieneRecibo = pedido.payment_receipts?.length > 0;
    img.src = tieneRecibo ? pedido.payment_receipts[0].file_url : "assets/img/no-receipt.png";
  }

  // 4. Estado y Interfaz
  let statusVisual = pedido.status;
  if (pedido.payment_method === "bank_transfer" && pedido.status === "pending" && pedido.payment_receipts?.length > 0) {
    statusVisual = "payment_review";
  }

  window.aplicarProgresoPedido(statusVisual);
  window.aplicarModoRecibo();
  
  if (pedido.status === 'cancelled' || pedido.status === 'delivered') {
    document.querySelector(".btn-cancelar")?.classList.add("hidden");
  }
};

/* =========================================================
   5. INICIALIZACIÓN AUTOMÁTICA
========================================================= */
if (window.ORDER_ID) {
  document.addEventListener("DOMContentLoaded", () => {
    window.cargarPedidoExistente(window.ORDER_ID);
  });
}
