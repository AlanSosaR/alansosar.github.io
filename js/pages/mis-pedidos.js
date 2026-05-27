/* ============================================================
   MIS PEDIDOS — DUAL PANEL (ADMIN-STYLE)
   CAFÉ CORTERO
============================================================ */

const sb = () => window.supabaseClient;

const IMG_CASH = "/imagenes/pago_en_mano.svg";
const IMG_DEFAULT = "/imagenes/recibo_default.svg";
const EMPTY_BASE = window.location.origin + "/imagenes/empty/";

let orders = [];
let filteredOrders = [];
let activeIndex = -1;
let autoRefresh = null;
let currentSearch = "";
let currentFilter = "pending";
let currentPage = 1;
const itemsPerPage = 5;

const $id = (id) => document.getElementById(id);

function isCashPayment(method) {
  return method === "cash_on_delivery" || method === "cash";
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return {
    fecha: d.toLocaleDateString("es-HN", {
      day: "2-digit", month: "short", year: "numeric"
    }),
    hora: d.toLocaleTimeString("es-HN", {
      hour: "2-digit", minute: "2-digit"
    })
  };
}

function normalizeOrderNumber(num) {
  return String(num ?? "").padStart(3, "0");
}

/* =========================
   STATUS MAP
========================= */
function getStatusDetails(status, paymentMethod) {
  const isCash = isCashPayment(paymentMethod);
  const map = isCash
    ? {
        steps: ["Pedido registrado", "Preparación", "En camino", "Entregado"],
        pending:     { step: 1, label: "Pedido registrado", desc: "Tu pedido fue recibido correctamente." },
        processing:  { step: 2, label: "Preparación", desc: "Estamos preparando tu pedido." },
        preparing:   { step: 2, label: "Preparación", desc: "Estamos preparando tu pedido." },
        shipped:     { step: 3, label: "En camino", desc: "El repartidor lleva tu pedido." },
        delivered:   { step: 4, label: "Entregado", desc: "Pedido entregado." }
      }
    : {
        steps: ["Pago enviado", "Revisión", "Confirmado", "Enviado"],
        pending:        { step: 1, label: "Pago enviado", desc: "Validando comprobante." },
        payment_review: { step: 2, label: "Revisión", desc: "Revisando el pago." },
        processing:     { step: 3, label: "Confirmado", desc: "Pedido confirmado." },
        preparing:      { step: 3, label: "Confirmado", desc: "Pedido confirmado." },
        shipped:        { step: 4, label: "Enviado", desc: "Pedido en camino." },
        delivered:      { step: 4, label: "Entregado", desc: "Pedido entregado." }
      };
  return { ...(map[status] || map.pending), steps: map.steps };
}

/* =========================
   HELPERS
========================= */
const STATUS_LABELS = {
  pending: "Pendiente",
  payment_review: "Revisión",
  processing: "Procesando",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado"
};

const STATUS_DOT = {
  pending: "pending",
  payment_review: "preparing",
  processing: "preparing",
  preparing: "preparing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled"
};

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  await esperarSupabase();
  const { data } = await sb().auth.getSession();
  if (!data?.session) return;

  await loadOrders(data.session.user.id);
  bindHeaderEvents();

  if (!orders.length) {
    renderEmpty("pending");
    return;
  }

  // Auto-detect first status that has orders
  const statusPriority = ["pending", "payment_review", "processing", "preparing", "shipped", "delivered", "cancelled"];
  const map = {
    pending: ["pending"],
    payment_review: ["payment_review"],
    processing: ["processing", "preparing"],
    preparing: ["processing", "preparing"],
    shipped: ["shipped"],
    delivered: ["delivered"],
    cancelled: ["cancelled"]
  };
  let detected = "pending";
  for (const s of statusPriority) {
    if (orders.some(o => (map[s] || [s]).includes(o.status))) {
      detected = s;
      break;
    }
  }
  currentFilter = detected;

  // Sync header filter dropdown
  const filterEl = document.getElementById("header-status-filter");
  if (filterEl) filterEl.value = detected;

  applyLocalFilters();
  startAutoRefresh(data.session.user.id);

  // Enlazar paginación de lista
  $id("list-prev")?.addEventListener("click", () => changePage(-1));
  $id("list-next")?.addEventListener("click", () => changePage(1));

  // Event delegation para clicks en la lista
  const list = $id("orders-list");
  if (list) {
    list.addEventListener("click", (e) => {
      const card = e.target.closest(".order-card-item-stitch");
      if (card && card.dataset.index !== undefined) {
        selectOrder(Number(card.dataset.index));
      }
    });
  }
}

/* =========================
   HEADER EVENTS
========================= */
function bindHeaderEvents() {
  document.addEventListener("header:search", (e) => {
    currentSearch = String(e.detail || "").toLowerCase().trim();
    applyLocalFilters();
  });

  document.addEventListener("header:filter", (e) => {
    currentFilter = e.detail || "all";
    applyLocalFilters();
  });
}

/* =========================
   FILTERS
========================= */
function applyLocalFilters() {
  filteredOrders = orders.filter((o) => {
    let matchStatus = true;
    if (currentFilter !== "all") {
      const map = {
        pending: ["pending"],
        payment_review: ["payment_review"],
        processing: ["processing", "preparing"],
        shipped: ["shipped"],
        delivered: ["delivered"],
        cancelled: ["cancelled"]
      };
      matchStatus = (map[currentFilter] || []).includes(o.status);
    }

    let matchSearch = true;
    if (currentSearch) {
      const byNumber =
        String(o.order_number).includes(currentSearch) ||
        normalizeOrderNumber(o.order_number).includes(currentSearch);
      const byProduct = o.items?.some((i) =>
        i.products?.name?.toLowerCase().includes(currentSearch)
      );
      matchSearch = byNumber || byProduct;
    }

    return matchStatus && matchSearch;
  });

  $id("empty-state")?.classList.add("hidden");
  activeIndex = -1;
  currentPage = 1;

  if (!filteredOrders.length) {
    showEmptyFilter();
    return;
  }

  showListAndDetail();
  renderOrderList(true);
  
  if (window.innerWidth > 768) {
    selectOrder(0);
  } else {
    document.body.classList.remove("detail-view-active");
    $id("order-detail")?.classList.add("hidden");
    $id("no-selection")?.classList.remove("hidden");
  }
}

/* =========================
   EMPTY / VISIBILITY
========================= */
function renderEmpty(filter) {
  const empty = $id("empty-state");
  if (!empty) return;
  $id("main-layout-stitch")?.classList.add("hidden");

  const title = empty.querySelector(".empty-title");
  const text = empty.querySelector(".empty-text");
  const img = empty.querySelector(".empty-illustration");

  const config = {
    pending:    ["Todo está al día por aquí", "No tienes pedidos pendientes.", "pending.svg"],
    new:        ["Todo está al día por aquí", "No tienes pedidos nuevos.", "pending.svg"],
    processing: ["Nada en preparación", "Cuando empecemos a trabajar en un pedido, aparecerá aquí.", "processing.svg"],
    shipped:    ["Sin envíos en camino", "Te avisaremos cuando un pedido salga.", "shipped.svg"],
    delivered:  ["Sin entregas aún", "Aquí verás tu historial de pedidos.", "delivered.svg"],
    cancelled:  ["Sin pedidos cancelados", "¡Excelente! No tienes compras canceladas.", "cancelled.svg"]
  };

  const [t, d, imgName] = config[filter] || config.pending;
  title.textContent = t;
  text.textContent = d;
  img.src = EMPTY_BASE + imgName;
  img.alt = t;
  empty.classList.remove("hidden");
}

function showEmptyFilter() {
  $id("main-layout-stitch")?.classList.remove("hidden");
  $id("orders-list").innerHTML = '<div class="loading-state">Sin pedidos para este filtro</div>';
  $id("order-detail")?.classList.add("hidden");
  $id("no-selection")?.classList.remove("hidden");
}

function showListAndDetail() {
  $id("empty-state")?.classList.add("hidden");
  $id("main-layout-stitch")?.classList.remove("hidden");
}

/* =========================
   LOAD ORDERS
========================= */
async function loadOrders(userId) {
  const { data } = await sb()
    .from("orders")
    .select(`
      id, order_number, total, status, payment_method, created_at, order_notes,
      address:addresses ( street, city ),
      receipt:payment_receipts ( file_url ),
      items:order_items ( quantity, price, products ( name ) )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  orders = data || [];
}

/* =========================
   RENDER ORDER LIST
========================= */
function renderOrderList(resetSelection = true) {
  const wrap = $id("orders-list");
  const tpl = $id("tpl-order-card");
  const pageInfo = $id("list-page-numbers");
  if (!wrap || !tpl) return;

  // Calcular paginación
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredOrders.slice(start, start + itemsPerPage);

  if (pageInfo) {
    pageInfo.textContent = filteredOrders.length > 0 ? `Pág. ${currentPage} / ${totalPages || 1}` : "0 / 0";
  }

  wrap.innerHTML = "";

  pageItems.forEach((o, pageIndex) => {
    const globalIndex = start + pageIndex;
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".order-card-item-stitch");
    const { fecha } = formatDateTime(o.created_at);

    node.querySelector(".card-order-number").textContent = `#${normalizeOrderNumber(o.order_number)}`;
    node.querySelector(".card-date").textContent = fecha;
    node.querySelector(".card-total").textContent = `L ${o.total.toFixed(2)}`;
    node.querySelector(".card-status-label").textContent = STATUS_LABELS[o.status] || o.status;

    const dot = node.querySelector(".card-status-dot");
    const dotColor = STATUS_DOT[o.status] || "pending";
    dot.classList.add(dotColor);

    if (globalIndex === activeIndex) card.classList.add("active");

    card.dataset.index = globalIndex;
    wrap.appendChild(node);
  });

  $id("orders-count-stitch").textContent = filteredOrders.length;
}

/* =========================
   SELECT & RENDER DETAIL
========================= */
function selectOrder(index) {
  if (!filteredOrders[index]) return;
  activeIndex = index;

  // Desmarcar todas las tarjetas activas de la página actual
  document.querySelectorAll(".order-card-item-stitch").forEach((c) => c.classList.remove("active"));
  
  // Buscar la tarjeta correspondiente en el DOM actual
  const cards = document.querySelectorAll(".order-card-item-stitch");
  const start = (currentPage - 1) * itemsPerPage;
  const pageIndex = index - start;
  if (cards[pageIndex]) {
    cards[pageIndex].classList.add("active");
    // Asegurar que la tarjeta activa sea visible (scroll)
    cards[pageIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // Marcar activo en mobile
  document.body.classList.add("detail-view-active");

  renderDetail(filteredOrders[index]);
}

/* =========================
   PAGINATION LOGIC
========================= */
function changePage(delta) {
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const newPage = currentPage + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderOrderList(false); // No resetear selección al cambiar de página
  }
}

function renderDetail(pedido) {
  const detail = $id("order-detail");
  const content = $id("order-detail-content");
  const noSel = $id("no-selection");
  if (!detail || !content) return;

  detail.classList.remove("hidden");
  noSel?.classList.add("hidden");
  content.classList.remove("hidden");

  const { fecha, hora } = formatDateTime(pedido.created_at);
  const status = getStatusDetails(pedido.status, pedido.payment_method);

  $id("order-id-display").textContent = `Pedido #${normalizeOrderNumber(pedido.order_number)}`;

  const badge = $id("order-status-badge");
  badge.textContent = status.label.toUpperCase();
  badge.className = `status-badge-stitch ${pedido.status}`;

  // Payment info
  $id("p-method").textContent =
    pedido.payment_method === "cash_on_delivery" || pedido.payment_method === "cash"
      ? "Pago en mano" : "Transferencia";
  $id("p-date").textContent = `${fecha} · ${hora}`;
  $id("p-total").textContent = `L ${pedido.total.toFixed(2)}`;

  // Receipt
  const receiptContainer = $id("receipt-container");
  const receiptLink = $id("receipt-link");
  if (isCashPayment(pedido.payment_method) || !pedido.receipt?.[0]?.file_url) {
    receiptContainer?.classList.add("hidden");
  } else {
    receiptContainer?.classList.remove("hidden");
    if (receiptLink) receiptLink.href = pedido.receipt[0].file_url;
  }

  // Address
  $id("o-address").textContent = pedido.address
    ? `${pedido.address.street}, ${pedido.address.city}`
    : "—";
  $id("o-reference").textContent = pedido.order_notes || "Sin referencia";

  // Timeline
  const steps = document.querySelectorAll(".timeline-steps-stitch .step");
  const stepNames = status.steps;
  const currentStep = status.step;

  steps.forEach((step, i) => {
    const label = stepNames[i] || "";
    step.querySelector(".step-label").textContent = label;
    step.classList.remove("active", "completed");
    if (i + 1 === currentStep) step.classList.add("active");
    else if (i + 1 < currentStep) step.classList.add("completed");
  });

  const pct = ((currentStep - 1) / 3) * 100;
  document.getElementById("timeline-progress-bar").style.width = `${pct}%`;

  // Products
  const itemsList = $id("order-items-list");
  itemsList.innerHTML = "";
  if (pedido.items) {
    pedido.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "item-mini-row";
      row.innerHTML = `
        <span class="item-name">${item.products?.name || "Café"}</span>
        <div class="item-meta">
          <span class="item-qty">×${item.quantity}</span>
          <span class="item-price">L ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `;
      itemsList.appendChild(row);
    });
  }

  // Scroll to top of detail on mobile
  detail.scrollTop = 0;
}

/* =========================
   SUPABASE READY
========================= */
function esperarSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) { clearInterval(i); resolve(); }
    }, 50);
  });
}

/* =========================
   MOBILE BACK
========================= */
$id("btn-back-to-list")?.addEventListener("click", () => {
  document.body.classList.remove("detail-view-active");
  $id("order-detail")?.classList.add("hidden");
  $id("no-selection")?.classList.add("hidden");
});

/* =========================
   AUTO REFRESH
========================= */
function startAutoRefresh(userId) {
  clearInterval(autoRefresh);
  autoRefresh = setInterval(async () => {
    const wasDetail = document.body.classList.contains("detail-view-active");
    const prevId = wasDetail && filteredOrders[activeIndex]?.id;

    await loadOrders(userId);
    activeIndex = -1;
    filteredOrders = [];
    applyLocalFilters();

    if (wasDetail && filteredOrders.length > 0) {
      const restoreIdx = prevId
        ? filteredOrders.findIndex(o => o.id === prevId)
        : -1;
      selectOrder(restoreIdx >= 0 ? restoreIdx : 0);
    }
  }, 30000);
}
