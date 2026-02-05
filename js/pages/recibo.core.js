/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO ESTABLE
 * Proyecto: Café Cortero — Material 3 Expressive
 */

console.log("🧾 recibo.core.js — READY");

/* =========================================================
   HELPERS & CONTEXTO
========================================================= */
const $id = (id) => document.getElementById(id);

window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   SUPABASE & SESIÓN
========================================================= */
window.esperarSupabase = () =>
  new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 50);
  });

window.getUserCache = () => {
  try {
    const u = localStorage.getItem("cortero_user");
    if (u) return JSON.parse(u);

    const key = Object.keys(localStorage).find(k => k.includes("-auth-token"));
    if (key) {
      const s = JSON.parse(localStorage.getItem(key));
      return s?.user || null;
    }
    return null;
  } catch {
    return null;
  }
};

window.showSnack = (msg, duration = 4000) => {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `<span class="snack-text">${msg}</span>`;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
};

/* =========================================================
   CANCELACIÓN — CONFIRMACIÓN
========================================================= */
function mostrarConfirmacionCancelacion(pedido) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
      <span class="snack-text">
        ¿Deseas cancelar el pedido <strong>#${pedido.order_number}</strong>?
      </span>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="snack-no"
          style="background:none;border:none;color:#fff;font-weight:600;">
          No
        </button>
        <button id="snack-si"
          style="background:#ff4436;border:none;color:#fff;
                 font-weight:600;padding:8px 16px;border-radius:8px;">
          Sí, cancelar
        </button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  $id("snack-no").onclick = () => bar.classList.remove("show");
  $id("snack-si").onclick = async () => {
    bar.classList.remove("show");
    await ejecutarCancelacion(pedido);
  };
}

async function ejecutarCancelacion(pedido) {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!sb || !pedido || !user) return;

  /* 🔒 UPDATE REAL + CONFIRMACIÓN */
  const { data, error } = await sb
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", pedido.id)
    .select("id,status")
    .single();

  if (error || !data) {
    window.showSnack("No se pudo cancelar el pedido");
    return;
  }

  /* 🔔 NOTIFICACIÓN AL ADMIN */
  await sb.from("notifications").insert({
    user_id: null,
    title: "Pedido cancelado",
    body: `El cliente ${pedido.users?.name || "Cliente"} canceló el pedido #${pedido.order_number}`,
    type: "order_cancelled",
    metadata: {
      order_id: pedido.id,
      order_number: pedido.order_number,
      customer_name: pedido.users?.name || null
    }
  });

  /* ✅ UI ACTUALIZADA */
  pedido.status = "cancelled";
  window.aplicarProgresoPedido("cancelled");
  window.showSnack("Pedido cancelado correctamente");

  const btn = $id("btnCancelarPedido") || document.querySelector(".btn-cancelar");
  if (btn) btn.remove();
}

/* =========================================================
   UI — MODO RECIBO
========================================================= */
window.aplicarModoRecibo = (pedido) => {
  const btnBack = $id("btn-back");
  if (btnBack) {
    btnBack.onclick = () => {
      window.location.href = "/pages/profile/mis-pedidos.html";
    };
  }

  const pagoLabel = document.querySelector(".pago-select-label");
  if (pagoLabel) pagoLabel.classList.add("hidden");

  const btnCancelar =
    $id("btnCancelarPedido") || document.querySelector(".btn-cancelar");

  if (!btnCancelar) return;

  if (pedido.status !== "pending") {
    btnCancelar.remove();
    return;
  }

  btnCancelar.disabled = false;
  btnCancelar.removeAttribute("disabled");
  btnCancelar.style.pointerEvents = "auto";
  btnCancelar.classList.remove("hidden", "disabled");

  btnCancelar.onclick = (e) => {
    e.preventDefault();
    mostrarConfirmacionCancelacion(pedido);
  };
};

/* =========================================================
   ESTADO — PÍLDORA
========================================================= */
window.aplicarProgresoPedido = (status) => {
  const el = $id("estado-pildora-container");
  if (!el) return;

  const map = {
    pending: ["Pendiente", "payments", "status-pending"],
    payment_review: ["Revisando pago", "fact_check", "status-review"],
    processing: ["En preparación", "coffee", "status-processing"],
    shipped: ["En camino", "local_shipping", "status-shipped"],
    delivered: ["Entregado", "check_circle", "status-delivered"],
    cancelled: ["Cancelado", "cancel", "status-cancelled"],
  };

  const [label, icon, cls] = map[status] || map.pending;

  el.innerHTML = `
    <div class="status-pill ${cls}">
      <span class="material-symbols-outlined">${icon}</span>
      <span>${label}</span>
    </div>
  `;
};

/* =========================================================
   CARGA DE PEDIDO
========================================================= */
window.cargarPedidoExistente = async (orderId) => {
  if (!orderId) return;

  await window.esperarSupabase();
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      *,
      users(name,email,phone),
      addresses(state,city,street),
      order_items(quantity,price,products(name)),
      payment_receipts(file_url)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    window.showSnack("No se encontró el pedido");
    return;
  }

  /* CABECERA */
  $id("numeroPedido").textContent = pedido.order_number;
  const d = new Date(pedido.created_at);
  $id("fechaPedido").textContent = d.toLocaleDateString();
  $id("horaPedido").textContent = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  $id("totalPedido").textContent = pedido.total.toFixed(2);
  $id("notaCliente").textContent = pedido.order_notes || "Sin nota";

  /* CLIENTE */
  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name;
    $id("correoCliente").textContent = pedido.users.email;
    $id("telefonoCliente").textContent = pedido.users.phone;
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent =
      `${pedido.addresses.state}, ${pedido.addresses.city}`;
    $id("direccionCliente").textContent = pedido.addresses.street;
  }

  /* PRODUCTOS */
  $id("listaProductos").innerHTML = pedido.order_items.map(it => `
    <div class="cafe-item">
      <span>${it.products.name} × ${it.quantity}</span>
      <strong>L ${(it.quantity * it.price).toFixed(2)}</strong>
    </div>
  `).join("");

/* ===============================
   COMPROBANTE / MÉTODO DE PAGO
   (SOLO VISTA RECIBO)
================================ */

// 🔓 LIBERAR BLOQUES PADRE (OBLIGATORIO)
if (window.IS_READ_ONLY) {
  const bloqueDeposito = $id("pago-deposito");
  const bloqueEfectivo = $id("pago-efectivo");

  if (bloqueDeposito) {
    bloqueDeposito.classList.remove("hidden");
    bloqueDeposito.style.display = "block";
  }

  if (bloqueEfectivo) {
    bloqueEfectivo.classList.remove("hidden");
    bloqueEfectivo.style.display = "block";
  }
}

const preview = $id("previewComprobante");
const img = $id("imgComprobante");

if (preview && img) {
  // Mostrar contenedor
  preview.classList.remove("hidden");
  preview.style.display = "flex";

  const isCash =
    pedido.payment_method === "cash" ||
    pedido.payment_method === "cash_on_delivery";

  if (isCash) {
    // 💵 Pago en efectivo → imagen local
    img.src = "/imagenes/pago_en_mano.svg";
    img.alt = "Pago en efectivo al recibir";

  } else if (pedido.payment_receipts?.length) {
    // 🧾 Transferencia con comprobante
    img.src = pedido.payment_receipts[0].file_url;
    img.alt = "Comprobante de pago";

  } else {
    // 📄 Transferencia sin comprobante
    img.src = "/imagenes/recibo_default.svg";
    img.alt = "Comprobante pendiente";
  }

  // Blindaje visual
  img.style.display = "block";
  img.loading = "lazy";

  // Fallback seguro (sin loop)
  img.onerror = () => {
    img.onerror = null;
    img.src = "/imagenes/recibo_default.svg";
  };
}

/* ESTADO */
let statusVisual = pedido.status;

if (
  pedido.payment_method === "bank_transfer" &&
  pedido.status === "pending" &&
  pedido.payment_receipts?.length
) {
  statusVisual = "payment_review";
}

window.aplicarProgresoPedido(statusVisual);
window.aplicarModoRecibo(pedido);

/* =========================================================
   AUTO INIT
========================================================= */
if (window.ORDER_ID) {
  document.addEventListener("DOMContentLoaded", () => {
    window.cargarPedidoExistente(window.ORDER_ID);
  });
}
