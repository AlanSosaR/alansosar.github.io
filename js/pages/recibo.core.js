console.log("🧾 recibo.core.js");

/* =========================================================
   CONSTANTES (GLOBAL CORE)
========================================================= */
window.CART_KEY = "cafecortero_cart";
window.RECEIPT_BUCKET = "payment-receipts";

/* =========================================================
   HELPERS
========================================================= */
window.$id = (id) => document.getElementById(id);

/* =========================================================
   CONTEXTO
========================================================= */
function getOrderIdFromURL() {
  return new URLSearchParams(window.location.search).get("id");
}

window.ORDER_ID = getOrderIdFromURL();
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   SNACKBAR (RESPETA MODO RECIBO)
========================================================= */
window.showSnack = function (
  msg,
  onAccept = null,
  actionText = null,
  onAction = null,
  duration = 6000
) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <span class="snack-text">${msg}</span>
    <div class="snack-actions">
      ${
        actionText && onAction && !IS_READ_ONLY
          ? `<button class="snack-action secondary">${actionText}</button>`
          : ""
      }
      <button class="snack-action primary">Aceptar</button>
    </div>
  `;

  bar.classList.add("show");

  const timer = setTimeout(() => {
    bar.classList.remove("show");
  }, duration);

  if (actionText && onAction && !IS_READ_ONLY) {
    bar.querySelector(".snack-action.secondary")
      ?.addEventListener("click", () => {
        clearTimeout(timer);
        bar.classList.remove("show");
        onAction();
      });
  }

  bar.querySelector(".snack-action.primary")
    ?.addEventListener("click", () => {
      clearTimeout(timer);
      bar.classList.remove("show");
      if (onAccept && !IS_READ_ONLY) onAccept();
    });
};

/* =========================================================
   ESPERAR SUPABASE
========================================================= */
window.esperarSupabase = function () {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
};

/* =========================================================
   USUARIO CACHE
========================================================= */
window.getUserCache = function () {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
};

/* =========================================================
   UI — MODO RECIBO (SOLO LECTURA)
========================================================= */
window.aplicarModoRecibo = function () {
  const progreso = $id("pedido-progreso-recibo");
  const pagos = document.querySelector(".pagos");
  const selectPago = document.querySelector(".pago-select-label");
  const botones = document.querySelector(".recibo-botones");

  const metodoPago = $id("metodoPago");
  const btnEnviar = $id("btnEnviar");

  if (IS_READ_ONLY) {
    progreso?.classList.remove("hidden");
    pagos?.classList.add("hidden");
    selectPago?.classList.add("hidden");
    botones?.classList.add("hidden");

    if (metodoPago) metodoPago.disabled = true;
    if (btnEnviar) btnEnviar.disabled = true;
  } else {
    progreso?.classList.add("hidden");
  }
};

/* =========================================================
   PROGRESO DEL PEDIDO
========================================================= */
window.aplicarProgresoPedido = function (status, paymentMethod) {
  const container = $id("pedido-progreso-recibo");
  if (!container) return;

  const steps = container.querySelectorAll(".step");
  const lines = container.querySelectorAll(".line");
  const estadoTexto = $id("estadoPedidoTexto");
  const estadoEl = container.querySelector(".estado");
  const iconEl = container.querySelector(".estado-icon");

  const clases = ["pago", "revision", "confirmado", "envio"];

  let etapaMap = {};
  let labelMap = {};

  if (paymentMethod === "bank_transfer") {
    etapaMap = {
      pending: 0,
      pending_payment: 0,
      payment_review: 1,
      payment_confirmed: 2,
      processing: 2,
      shipped: 3,
      delivered: 3
    };
    labelMap = {
      pending: "Pendiente de pago",
      pending_payment: "Pendiente de pago",
      payment_review: "Pago en revisión",
      payment_confirmed: "Pago confirmado",
      processing: "En ejecución",
      shipped: "Enviado",
      delivered: "Entregado"
    };
  } else {
    etapaMap = {
      pending: 0,
      cash_on_delivery: 0,
      processing: 1,
      shipped: 2,
      delivered: 3
    };
    labelMap = {
      pending: "Pago al recibir",
      cash_on_delivery: "Pago al recibir",
      processing: "En ejecución",
      shipped: "Enviado",
      delivered: "Entregado"
    };
  }

  const etapa = etapaMap[status] ?? 0;

  steps.forEach((s, i) => {
    s.classList.remove(...clases);
    if (i <= etapa) s.classList.add(clases[i]);
  });

  lines.forEach((l, i) => {
    l.classList.remove(...clases);
    if (i < etapa) l.classList.add(clases[i]);
  });

  estadoEl.classList.remove(...clases);
  estadoEl.classList.add(clases[etapa]);
  estadoTexto.textContent = labelMap[status] || "Pendiente";

  const iconMap = {
    pending: "payments",
    pending_payment: "payments",
    payment_review: "fact_check",
    payment_confirmed: "verified",
    cash_on_delivery: "payments",
    processing: "autorenew",
    shipped: "local_shipping",
    delivered: "done_all"
  };

  iconEl.textContent = iconMap[status] || "payments";
  container.classList.remove("hidden");
};

/* =========================================================
   CARGAR PEDIDO EXISTENTE (🔥 CLAVE DEL BUG)
========================================================= */
window.cargarPedidoExistente = async function (orderId) {
  const sb = window.supabaseClient;

  const { data: order, error } = await sb
    .from("orders")
    .select(`
      id,
      order_number,
      total,
      status,
      payment_method,
      payment_status,
      created_at,
      order_items (
        quantity,
        price,
        products ( name )
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("❌ Pedido no encontrado", error);
    showSnack("Pedido no encontrado");
    return;
  }

  // Render básico (ajusta si ya tienes uno más completo)
  $id("numeroPedido").textContent = order.order_number;
  $id("totalPedido").textContent = order.total.toFixed(2);

  aplicarProgresoPedido(order.status, order.payment_method);
};
