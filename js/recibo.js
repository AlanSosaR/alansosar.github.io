console.log("🧾 recibo.js — CORE FINAL DEFINITIVO");

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
   MÉTODO DE PAGO (CHECKOUT)
========================================================= */
const metodoPago = $id("metodoPago");
const bloqueDeposito = $id("pago-deposito");
const bloqueEfectivo = $id("pago-efectivo");
const btnEnviar = $id("btnEnviar");
const loader = $id("loaderEnviar");

const inputFile = $id("inputComprobante");
const previewBox = $id("previewComprobante");
const imgPreview = $id("imgComprobante");
const btnSubirComprobante = $id("btnSubirComprobante");

/* =========================================================
   CONTEXTO
========================================================= */
function getOrderIdFromURL() {
  return new URLSearchParams(window.location.search).get("id");
}
const ORDER_ID = getOrderIdFromURL();
const IS_READ_ONLY = Boolean(ORDER_ID);

/* =========================================================
   SNACKBAR
========================================================= */
function showSnack(msg) {
  const bar = $id("snackbar");
  if (!bar) return;
  bar.innerHTML = `<span>${msg}</span>`;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 3200);
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
   UI — MODO RECIBO
========================================================= */
function aplicarModoRecibo() {
  const progreso = $id("pedido-progreso-recibo");
  const selectPago = document.querySelector(".pago-select-label");
  const botones = document.querySelector(".recibo-botones");

  if (IS_READ_ONLY) {
    progreso?.classList.remove("hidden");
    selectPago?.classList.add("hidden");
    botones?.classList.add("hidden");
    metodoPago && (metodoPago.disabled = true);
    btnEnviar && (btnEnviar.disabled = true);
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
      pending_payment: 0,
      payment_review: 1,
      payment_confirmed: 2,
      processing: 2,
      shipped: 3,
      delivered: 3
    };
    labelMap = {
      pending_payment: "Pendiente de pago",
      payment_review: "Pago en revisión",
      payment_confirmed: "Pago confirmado",
      processing: "En ejecución",
      shipped: "Enviado",
      delivered: "Entregado"
    };
  } else {
    etapaMap = {
      cash_on_delivery: 0,
      processing: 1,
      shipped: 2,
      delivered: 3
    };
    labelMap = {
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

/* =========================================================
   NÚMERO PROVISIONAL
========================================================= */
async function setNumeroPedidoProvisional() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const { data } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1);

  const next = (data?.[0]?.order_number || 0) + 1;
  $id("numeroPedido").textContent = next;
  $id("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true
  });
}

/* =========================================================
   DATOS CLIENTE (CHECKOUT)
========================================================= */
let selectedAddressId = null;

async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const { data: userRow } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    $id("nombreCliente").textContent = userRow.name || "—";
    $id("correoCliente").textContent = userRow.email || "—";
    $id("telefonoCliente").textContent = userRow.phone || "—";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("id,state,city,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    $id("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    $id("direccionCliente").textContent = addr[0].street || "—";
    $id("notaCliente").textContent = addr[0].postal_code || "—";
  }
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE (MIS PEDIDOS)
========================================================= */
async function cargarPedidoExistente(orderId) {
  const sb = window.supabaseClient;

  const { data: pedido } = await sb
    .from("orders")
    .select(`
      order_number,
      created_at,
      total,
      status,
      payment_method,
      users(name,email,phone),
      addresses(state,city,street,postal_code),
      order_items(quantity,price,products(name)),
      payment_receipts(file_url,created_at)
    `)
    .eq("id", orderId)
    .single();

  if (!pedido) return showSnack("Pedido no encontrado");

  $id("numeroPedido").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  const fecha = new Date(pedido.created_at);
  $id("fechaPedido").textContent = fecha.toLocaleDateString("es-HN", {
    day: "2-digit", month: "short", year: "numeric"
  });
  $id("horaPedido").textContent = fecha.toLocaleTimeString("es-HN", {
    hour: "2-digit", minute: "2-digit", hour12: true
  });

  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name || "—";
    $id("correoCliente").textContent = pedido.users.email || "—";
    $id("telefonoCliente").textContent = pedido.users.phone || "—";
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent =
      `${pedido.addresses.state}, ${pedido.addresses.city}`;
    $id("direccionCliente").textContent =
      pedido.addresses.street || "—";
    $id("notaCliente").textContent =
      pedido.addresses.postal_code || "—";
  }

  const lista = $id("listaProductos");
  lista.innerHTML = "";
  pedido.order_items.forEach(i => {
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${i.products.name} (${i.quantity})</span>
        <span>L ${(i.quantity * i.price).toFixed(2)}</span>
      </div>`;
  });

  $id("totalPedido").textContent = pedido.total.toFixed(2);
  aplicarProgresoPedido(pedido.status, pedido.payment_method);

  if (pedido.payment_method === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");

    if (pedido.payment_receipts?.length) {
      const receipt = pedido.payment_receipts.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0];

      previewBox.classList.remove("hidden");
      imgPreview.src = receipt.file_url;
      imgPreview.style.display = "block";

      btnSubirComprobante?.classList.add("hidden");
      inputFile?.classList.add("hidden");
    }
  }
}

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();
  const user = getUserCache();
  if (!user) return location.href = "login.html";

  aplicarModoRecibo();

  if (IS_READ_ONLY) {
    await cargarPedidoExistente(ORDER_ID);
  } else {
    await setNumeroPedidoProvisional();
    await cargarDatosCliente();
    resetMetodoPago();
  }
})();
