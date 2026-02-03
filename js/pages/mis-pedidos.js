/* ============================================================
   📦 MIS PEDIDOS — UX FLUIDA (FINAL DEFINITIVO)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL DEFINITIVO");

const sb = () => window.supabaseClient;

const IMG_CASH = "/imagenes/pago_en_mano.svg";
const IMG_DEFAULT = "/imagenes/recibo_default.svg";

/* ============================================================
   STATE
============================================================ */
let orders = [];
let filteredOrders = [];
let activeIndex = 0;
let autoRefresh = null;

let currentSearch = "";
let currentFilter = "pending";

/* ============================================================
   HELPERS
============================================================ */
const $id = (id) => document.getElementById(id);

function formatDateTime(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) throw new Error();
    return {
      fecha: d.toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      hora: d.toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { fecha: "--", hora: "--" };
  }
}

function normalizeOrderNumber(num) {
  return String(num ?? "").padStart(3, "0");
}

/* ============================================================
   STATUS MAP (CON TEXTOS)
============================================================ */
function getStatusDetails(status, paymentMethod) {
  const isCash = paymentMethod === "cash";

  const map = isCash
    ? {
        steps: [
          "Pedido registrado",
          "Preparación",
          "En camino",
          "Entregado",
        ],
        pending: { step: 1, label: "Pedido registrado", desc: "Tu pedido fue recibido correctamente." },
        processing: { step: 2, label: "En preparación", desc: "Estamos preparando tu pedido." },
        shipped: { step: 3, label: "En camino", desc: "El repartidor lleva tu pedido." },
        delivered: { step: 4, label: "Entregado", desc: "Pedido entregado." },
      }
    : {
        steps: [
          "Pago enviado",
          "En revisión",
          "Confirmado",
          "Enviado",
        ],
        pending: { step: 1, label: "Pago enviado", desc: "Validando comprobante." },
        payment_review: { step: 2, label: "En revisión", desc: "Revisando el pago." },
        processing: { step: 3, label: "Confirmado", desc: "Pedido confirmado." },
        shipped: { step: 4, label: "Enviado", desc: "Pedido en camino." },
        delivered: { step: 4, label: "Entregado", desc: "Pedido entregado." },
      };

  return { ...(map[status] || map.pending), steps: map.steps };
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await esperarSupabase();

  const { data } = await sb().auth.getSession();
  if (!data?.session) return;

  await loadOrders(data.session.user.id);

  if (!orders.length) {
    showGlobalEmpty();
    return;
  }

  bindHeaderEvents();
  applyLocalFilters();
  startAutoRefresh(data.session.user.id);
}

/* ============================================================
   HEADER EVENTS
============================================================ */
function bindHeaderEvents() {
  document.addEventListener("header:search", (e) => {
    currentSearch = String(e.detail || "").toLowerCase().trim();
    applyLocalFilters();
  });

  document.addEventListener("header:filter", (e) => {
    currentFilter = e.detail || "pending";
    applyLocalFilters();
  });
}

/* ============================================================
   FILTERS
============================================================ */
const STATUS_FILTER_MAP = {
  pending: ["pending", "payment_review", "paid"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
};

function applyLocalFilters() {
  filteredOrders = orders.filter((o) => {
    const matchStatus =
      STATUS_FILTER_MAP[currentFilter]?.includes(o.status) ?? true;

    let matchSearch = true;
    if (currentSearch) {
      const byNumber = normalizeOrderNumber(o.order_number).includes(currentSearch);
      const byProduct = o.items?.some((i) =>
        i.products?.name?.toLowerCase().includes(currentSearch)
      );
      matchSearch = byNumber || byProduct;
    }

    return matchStatus && matchSearch;
  });

  if (!filteredOrders.length) {
    showFilteredEmpty();
    return;
  }

  hideFilteredEmpty();
  renderCarousel();
  selectOrder(0);
}

/* ============================================================
   SUPABASE READY
============================================================ */
function esperarSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 50);
  });
}

/* ============================================================
   LOAD ORDERS
============================================================ */
async function loadOrders(userId) {
  const { data } = await sb()
    .from("orders")
    .select(`
      id,
      order_number,
      total,
      status,
      payment_method,
      created_at,
      reference,
      address:addresses ( street, city ),
      receipt:payment_receipts ( file_url ),
      items:order_items (
        quantity,
        price,
        products ( name, image_url )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  orders = data || [];
}

/* ============================================================
   EMPTY STATES
============================================================ */
function showFilteredEmpty() {
  $id("pedido-activo")?.classList.add("hidden");
  $id("mis-pedidos-carrusel")?.classList.add("hidden");
  $id("empty-state")?.classList.remove("hidden");
}

function hideFilteredEmpty() {
  $id("empty-state")?.classList.add("hidden");
  $id("pedido-activo")?.classList.remove("hidden");
  $id("mis-pedidos-carrusel")?.classList.remove("hidden");
}

function showGlobalEmpty() {
  showFilteredEmpty();
}

/* ============================================================
   CARRUSEL
============================================================ */
function renderCarousel() {
  const wrap = $id("pedidos-carrusel");
  const tpl = $id("pedido-carrusel-template");
  if (!wrap || !tpl) return;

  wrap.innerHTML = "";

  filteredOrders.forEach((o, index) => {
    const node = tpl.content.cloneNode(true);

    node.querySelector(".pedido-mini-numero").textContent =
      `Pedido N. ${normalizeOrderNumber(o.order_number)}`;

    node.querySelector(".pedido-mini-total").textContent =
      `L ${Number(o.total).toFixed(2)}`;

    node.querySelector(".pedido-mini-status").textContent =
      getStatusDetails(o.status, o.payment_method).label;

    node.querySelector(".pedido-mini-img").src =
      o.items?.[0]?.products?.image_url ||
      (o.payment_method === "cash" ? IMG_CASH : IMG_DEFAULT);

    node.querySelector(".similar-card").onclick = () => selectOrder(index);

    wrap.appendChild(node);
  });
}

/* ============================================================
   SELECCIÓN + SCROLL
============================================================ */
function selectOrder(index) {
  if (!filteredOrders[index]) return;
  activeIndex = index;

  document.querySelectorAll(".similar-card").forEach((c) =>
    c.classList.remove("is-selected")
  );
  document.querySelectorAll(".similar-card")[index]?.classList.add("is-selected");

  renderPedidoActivo(filteredOrders[index]);

  requestAnimationFrame(() => {
    $id("pedido-activo")?.scrollIntoView({ behavior: "smooth" });
  });
}

/* ============================================================
   PEDIDO ACTIVO (DETALLE COMPLETO)
============================================================ */
function renderPedidoActivo(pedido) {
  const container = $id("pedido-activo");
  const tpl = $id("pedido-activo-template");
  if (!container || !tpl) return;

  container.innerHTML = "";
  const node = tpl.content.cloneNode(true);

  const status = getStatusDetails(pedido.status, pedido.payment_method);
  const { fecha, hora } = formatDateTime(pedido.created_at);

  node.querySelector(".pedido-numero").textContent =
    `Pedido N. ${pedido.order_number}`;

  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${pedido.total.toFixed(2)}`;

  /* Entrega */
  node.querySelector(".entrega").textContent =
    pedido.address
      ? `${pedido.address.street}, ${pedido.address.city}`
      : "Entrega pendiente";

  /* Referencia */
  node.querySelector(".referencia").textContent =
    pedido.reference || "Sin referencia";

  /* Estado */
  node.querySelector(".estado-nombre").textContent = status.label;
  node.querySelector(".estado-descripcion").textContent = status.desc;

  /* Píldoras */
  const stepsWrap = node.querySelector(".estado-steps");
  stepsWrap.innerHTML = "";
  status.steps.forEach((label, i) => {
    const s = document.createElement("div");
    s.className = "estado-step";
    if (i + 1 <= status.step) s.classList.add("active");
    s.innerHTML = `<span>${i + 1}</span><small>${label}</small>`;
    stepsWrap.appendChild(s);
  });

  /* Recibo */
  const btnRecibo = node.querySelector(".ver-recibo");
  if (pedido.receipt?.[0]?.file_url) {
    btnRecibo.href = pedido.receipt[0].file_url;
    btnRecibo.classList.remove("hidden");
  } else {
    btnRecibo.classList.add("hidden");
  }

  /* Imagen */
  const img = node.querySelector(".pedido-imagen");
  img.src =
    pedido.items?.[0]?.products?.image_url ||
    (pedido.payment_method === "cash" ? IMG_CASH : IMG_DEFAULT);

  container.appendChild(node);
}

/* ============================================================
   AUTO REFRESH
============================================================ */
function startAutoRefresh(userId) {
  clearInterval(autoRefresh);
  autoRefresh = setInterval(async () => {
    await loadOrders(userId);
    applyLocalFilters();
  }, 30000);
}
