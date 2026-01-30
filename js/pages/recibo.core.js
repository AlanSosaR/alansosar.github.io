console.log("🧾 recibo.core.js");

/* =========================================================
   CONSTANTES
========================================================= */
const CART_KEY = "cafecortero_cart";
const RECEIPT_BUCKET = "payment-receipts";

/* =========================================================
   HELPERS
========================================================= */
const $id = (id) => document.getElementById(id);

/* =========================================================
   CONTEXTO
========================================================= */
function getOrderIdFromURL() {
  return new URLSearchParams(window.location.search).get("id");
}

const ORDER_ID = getOrderIdFromURL();
const IS_READ_ONLY = Boolean(ORDER_ID);

/* =========================================================
   SNACKBAR (RESPETA MODO RECIBO)
========================================================= */
function showSnack(
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
}

/* =========================================================
   ESPERAR SUPABASE
========================================================= */
function esperarSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
}

/* =========================================================
   USUARIO CACHE
========================================================= */
function getUserCache() {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

/* =========================================================
   UI — MODO RECIBO (SOLO LECTURA)
========================================================= */
function aplicarModoRecibo() {
  const progreso = $id("pedido-progreso-recibo");
  const pagos = document.querySelector(".pagos");
  const selectPago = document.querySelector(".pago-select-label");
  const botones = document.querySelector(".recibo-botones");

  const metodoPago = $id("metodoPago");
  const btnEnviar = $id("btnEnviar");

  if (IS_READ_ONLY) {
    // Mostrar progreso
    progreso?.classList.remove("hidden");

    // Ocultar TODO checkout
    pagos?.classList.add("hidden");
    selectPago?.classList.add("hidden");
    botones?.classList.add("hidden");

    // Bloquear inputs
    if (metodoPago) metodoPago.disabled = true;
    if (btnEnviar) btnEnviar.disabled = true;
  } else {
    progreso?.classList.add("hidden");
  }
}

/* =========================================================
   PROGRESO DEL PEDIDO
========================================================= */
function aplicarProgresoPedido(status, paymentMethod) {
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
}
