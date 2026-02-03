/* ============================================================
   📦 MIS PEDIDOS — UX FLUIDA (FINAL DEFINITIVO)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL DEFINITIVO");

const sb = () => window.supabaseClient;

const IMG_CASH = "/imagenes/pago_en_mano.svg";
const IMG_DEFAULT = "/imagenes/recibo_default.svg";

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
  const d = new Date(dateStr);
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
}

function normalizeOrderNumber(num) {
  // 1 → 001 | 10 → 010
  return String(num).padStart(3, "0");
}

/* ============================================================
   STATUS MAP (VISUAL)
============================================================ */
function getStatusDetails(status, paymentMethod) {
  const isCash = paymentMethod === "cash";

  const map = isCash
    ? {
        steps: ["Pedido registrado", "Preparación", "En camino", "Entregado"],
        pending: { step: 1, label: "Pedido registrado", desc: "Tu pedido fue recibido correctamente." },
        processing: { step: 2, label: "Preparación", desc: "Estamos preparando tu pedido." },
        shipped: { step: 3, label: "En camino", desc: "El repartidor lleva tu pedido." },
        delivered: { step: 4, label: "Entregado", desc: "Pedido entregado." },
      }
    : {
        steps: ["Pago enviado", "Revisión", "Confirmado", "Enviado"],
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
    currentSearch = (e.detail || "").toLowerCase().trim();
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
  pending: ["pending", "payment_review"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

function applyLocalFilters() {
  filteredOrders = orders.filter((o) => {
    /* STATUS */
    const matchStatus =
      STATUS_FILTER_MAP[currentFilter]?.includes(o.status) ?? true;

    /* SEARCH */
    let matchSearch = true;
    if (currentSearch) {
      const search = currentSearch;

      const byNumber =
        normalizeOrderNumber(o.order_number).includes(search) ||
        String(o.order_number).includes(search);

      const byProduct = o.items?.some((i) =>
        i.products?.name?.toLowerCase().includes(search)
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
  const { data, error } = await sb()
    .from("orders")
    .select(`
      id,
      order_number,
      total,
      status,
      payment_method,
      created_at,
      order_notes,
      address:addresses ( street, city ),
      receipt:payment_receipts ( file_url ),
      items:order_items (
        quantity,
        price,
        products ( name )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error) orders = data || [];
}

/* ============================================================
   EMPTY STATES
============================================================ */
function showFilteredEmpty() {
  $id("pedido-activo")?.classList.add("hidden");
  $id("mis-pedidos-carrusel")?.classList.add("hidden");

  const empty = $id("empty-state");
  if (!empty) return;

  const title = empty.querySelector(".empty-title");
  const text = empty.querySelector(".empty-text");

  const labels = {
    pending: "No tienes pedidos pendientes",
    processing: "No tienes pedidos en preparación",
    shipped: "No tienes pedidos en camino",
    delivered: "No tienes pedidos entregados",
    cancelled: "No tienes pedidos cancelados",
  };

  title.textContent = labels[currentFilter] || "No hay pedidos";
  text.textContent = currentSearch
    ? "No se encontraron pedidos con ese criterio."
    : "Cuando tengas pedidos en este estado, aparecerán aquí.";

  empty.classList.remove("hidden");
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
    const card = node.querySelector(".similar-card");

    node.querySelector(".pedido-mini-numero").textContent =
      `N.º ${normalizeOrderNumber(o.order_number)}`;
    node.querySelector(".pedido-mini-total").textContent =
      `L ${o.total.toFixed(2)}`;

    node.querySelector(".pedido-mini-status").textContent =
      getStatusDetails(o.status, o.payment_method).label;

    node.querySelector(".pedido-mini-img").src =
      o.payment_method === "cash"
        ? IMG_CASH
        : o.receipt?.[0]?.file_url || IMG_DEFAULT;

    if (index === activeIndex) card.classList.add("is-selected");
    card.onclick = () => selectOrder(index);

    wrap.appendChild(node);
  });

  bindCarouselArrows();
}

/* ============================================================
   SELECCIÓN
============================================================ */
function selectOrder(index) {
  if (!filteredOrders[index]) return;
  activeIndex = index;

  document.querySelectorAll(".similar-card").forEach((c) =>
    c.classList.remove("is-selected")
  );
  document.querySelectorAll(".similar-card")[index]?.classList.add("is-selected");

  renderPedidoActivo(filteredOrders[index]);
}

/* ============================================================
   PEDIDO ACTIVO
============================================================ */
function renderPedidoActivo(pedido) {
  const container = $id("pedido-activo");
  const tpl = $id("pedido-activo-template");
  if (!container || !tpl) return;

  container.innerHTML = "";
  const node = tpl.content.cloneNode(true);

  const status = getStatusDetails(pedido.status, pedido.payment_method);
  const { fecha, hora } = formatDateTime(pedido.created_at);

  node.querySelector(".pedido-numero").textContent = `Pedido N.º ${pedido.order_number}`;
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${pedido.total.toFixed(2)}`;
  node.querySelector(".estado-nombre").textContent = status.label;
  node.querySelector(".estado-descripcion").textContent = status.desc;
  node.querySelector(".estado-paso").textContent = status.step;

  container.appendChild(node);
}

/* ============================================================
   ARROWS
============================================================ */
function bindCarouselArrows() {
  const list = $id("pedidos-carrusel");
  $id("pedidos-prev").onclick = () =>
    list.scrollBy({ left: -300, behavior: "smooth" });
  $id("pedidos-next").onclick = () =>
    list.scrollBy({ left: 300, behavior: "smooth" });
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
