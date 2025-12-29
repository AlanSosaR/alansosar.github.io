console.log("🧾 recibo.js — CORE FINAL ESTABLE");

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
   ELEMENTOS UI
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
   USUARIO — ÚNICA FUENTE (SUPABASE AUTH)
========================================================= */
async function getUser() {
  const sb = window.supabaseClient;
  const { data, error } = await sb.auth.getSession();
  if (error || !data?.session) return null;
  return data.session.user;
}

/* =========================================================
   UI — MODO RECIBO
========================================================= */
function aplicarModoRecibo() {
  $id("pedido-progreso-recibo")?.classList.toggle("hidden", !IS_READ_ONLY);
  document.querySelector(".pago-select-label")?.classList.toggle("hidden", IS_READ_ONLY);
  document.querySelector(".recibo-botones")?.classList.toggle("hidden", IS_READ_ONLY);

  if (metodoPago) metodoPago.disabled = IS_READ_ONLY;
  if (btnEnviar) btnEnviar.disabled = IS_READ_ONLY;
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

  const map = paymentMethod === "bank_transfer"
    ? {
        pending_payment: 0,
        payment_review: 1,
        payment_confirmed: 2,
        processing: 2,
        shipped: 3,
        delivered: 3
      }
    : {
        cash_on_delivery: 0,
        processing: 1,
        shipped: 2,
        delivered: 3
      };

  const labels = {
    pending_payment: "Pendiente de pago",
    payment_review: "Pago en revisión",
    payment_confirmed: "Pago confirmado",
    cash_on_delivery: "Pago al recibir",
    processing: "En ejecución",
    shipped: "Enviado",
    delivered: "Entregado"
  };

  const icons = {
    pending_payment: "payments",
    payment_review: "fact_check",
    payment_confirmed: "verified",
    cash_on_delivery: "payments",
    processing: "autorenew",
    shipped: "local_shipping",
    delivered: "done_all"
  };

  const etapa = map[status] ?? 0;

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

  estadoTexto.textContent = labels[status] || "Pendiente de pago";
  iconEl.textContent = icons[status] || "payments";

  container.classList.remove("hidden");
}

/* =========================================================
   NÚMERO PROVISIONAL (CHECKOUT)
========================================================= */
async function setNumeroPedidoProvisional() {
  const sb = window.supabaseClient;
  const user = await getUser();
  if (!user) return;

  const { data } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1);

  const next = (data?.[0]?.order_number || 0) + 1;
  $id("numeroPedido").textContent = next;

  const now = new Date();
  $id("fechaPedido").textContent = now.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  $id("horaPedido").textContent = now.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

/* =========================================================
   DATOS CLIENTE
========================================================= */
let selectedAddressId = null;

async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = await getUser();
  if (!user) return;

  const { data: u } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (u) {
    $id("nombreCliente").textContent = u.name || "—";
    $id("correoCliente").textContent = u.email || "—";
    $id("telefonoCliente").textContent = u.phone || "—";
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
   CARGAR PEDIDO EXISTENTE
========================================================= */
async function cargarPedidoExistente(orderId) {
  const sb = window.supabaseClient;

  const { data: pedido } = await sb
    .from("orders")
    .select(`
      order_number, created_at, total, status, payment_method,
      users(name,email,phone),
      addresses(state,city,street,postal_code),
      order_items(quantity,price,products(name)),
      payment_receipts(file_url,created_at)
    `)
    .eq("id", orderId)
    .single();

  if (!pedido) return showSnack("Pedido no encontrado");

  $id("numeroPedido").textContent = String(pedido.order_number).padStart(3, "0");

  const f = new Date(pedido.created_at);
  $id("fechaPedido").textContent = f.toLocaleDateString("es-HN", {
    day: "2-digit", month: "short", year: "numeric"
  });
  $id("horaPedido").textContent = f.toLocaleTimeString("es-HN", {
    hour: "2-digit", minute: "2-digit", hour12: true
  });

  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name || "—";
    $id("correoCliente").textContent = pedido.users.email || "—";
    $id("telefonoCliente").textContent = pedido.users.phone || "—";
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent = `${pedido.addresses.state}, ${pedido.addresses.city}`;
    $id("direccionCliente").textContent = pedido.addresses.street || "—";
    $id("notaCliente").textContent = pedido.addresses.postal_code || "—";
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

  if (pedido.payment_method === "bank_transfer" && pedido.payment_receipts?.length) {
    const r = pedido.payment_receipts.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
    bloqueDeposito.classList.remove("hidden");
    previewBox.classList.remove("hidden");
    imgPreview.src = r.file_url;
  }
}

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();
  const user = await getUser();
  if (!user) return location.href = "login.html";

  aplicarModoRecibo();

  if (IS_READ_ONLY) {
    await cargarPedidoExistente(ORDER_ID);
  } else {
    await setNumeroPedidoProvisional();
    await cargarDatosCliente();
  }
})();
