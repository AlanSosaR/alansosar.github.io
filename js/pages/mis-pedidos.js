/* ============================================================
   📦 MIS PEDIDOS — UX FLUIDA (FINAL ESTABLE + SEARCH FIX)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL ESTABLE");

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
let currentFilter = "all";

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
  return String(num ?? "").padStart(3, "0");
}

/* ============================================================
   STATUS MAP
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
    showEmpty();
    return;
  }

  filteredOrders = [...orders];
  bindHeaderEvents();

  mostrarCarrusel();
  renderCarousel();
  selectOrder(0);

  startAutoRefresh(data.session.user.id);
}

/* ============================================================
   HEADER EVENTS (🔍 BUSCADOR LIMPIO)
============================================================ */
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

/* ============================================================
   FILTROS + BUSCADOR
============================================================ */
function applyLocalFilters() {
  filteredOrders = orders.filter((o) => {
    /* -------- STATUS -------- */
let matchStatus = true;
if (currentFilter !== "all") {
  const map = {
    pending: ["pending"],              // ✅ FIX CLAVE
    new: ["pending", "payment_review"],
    processing: ["processing"],
    shipped: ["shipped"],
    delivered: ["delivered"],
    cancelled: ["cancelled"],
  };

  matchStatus = (map[currentFilter] || []).includes(o.status);
}

    /* -------- SEARCH -------- */
    let matchSearch = true;
    if (currentSearch) {
      const orderNumRaw = String(o.order_number);
      const orderNumNorm = normalizeOrderNumber(o.order_number);

      const byNumber =
        orderNumRaw.includes(currentSearch) ||
        orderNumNorm.includes(currentSearch);

      const byProduct = o.items?.some((i) =>
        i.products?.name?.toLowerCase().includes(currentSearch)
      );

      matchSearch = byNumber || byProduct;
    }

    return matchStatus && matchSearch;
  });

  /* -------- EMPTY RESULT -------- */
  if (!filteredOrders.length) {
    ocultarTodoPorFiltro();
    mostrarEmptyPorFiltro(); // 👈 ESTA LÍNEA ES LA CLAVE
    return;
  }

  /* -------- RESTORE UI -------- */
  mostrarCarrusel();
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
   LOAD ORDERS (NO TOCADO)
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

  orders = data || [];
}

/* ============================================================
   UI VISIBILITY
============================================================ */
function mostrarCarrusel() {
  $id("mis-pedidos-carrusel")?.classList.remove("hidden");
  $id("pedido-activo")?.classList.remove("hidden");
  $id("empty-state")?.classList.add("hidden");
}

function ocultarTodoPorFiltro() {
  $id("pedido-activo")?.classList.add("hidden");
  $id("mis-pedidos-carrusel")?.classList.add("hidden");
}

/* ============================================================
   CARRUSEL (NO TOCADO)
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

    const status = getStatusDetails(o.status, o.payment_method);
    node.querySelector(".pedido-mini-status").textContent = status.label;

    const img = node.querySelector(".pedido-mini-img");
    img.src =
      o.payment_method === "cash"
        ? IMG_CASH
        : o.receipt?.[0]?.file_url || IMG_DEFAULT;

    card.onclick = () => selectOrder(index);
    wrap.appendChild(node);
  });

  bindCarouselArrows();
}

/* ============================================================
   SELECCIÓN + SCROLL SUAVE
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
    $id("pedido-activo")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

/* ============================================================
   PEDIDO ACTIVO (NO TOCADO)
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
    `Pedido N.º ${pedido.order_number}`;
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${pedido.total.toFixed(2)}`;

  node.querySelector(".entrega-text").textContent =
    pedido.address
      ? `${pedido.address.street}, ${pedido.address.city}`
      : "—";

  node.querySelector(".referencia-text").textContent =
    pedido.order_notes || "Sin referencia";

  node.querySelector(".estado-nombre").textContent = status.label;
  node.querySelector(".estado-descripcion").textContent = status.desc;
  node.querySelector(".estado-paso").textContent = status.step;

  const pasos = node.querySelectorAll(".estado-item");
  pasos.forEach((li, i) => {
    li.querySelector(".step-text").textContent = status.steps[i];
    li.classList.toggle("activo", i + 1 === status.step);
    li.classList.toggle("completado", i + 1 < status.step);
  });

  const pills = node.querySelector(".productos-pills");
  pedido.items?.forEach((item) => {
    const p = document.createElement("div");
    p.className = "pill";
    p.innerHTML = `
      <span>${item.products.name} × ${item.quantity}</span>
      <strong>L ${(item.quantity * item.price).toFixed(2)}</strong>
    `;
    pills.appendChild(p);
  });

  node.querySelector(".recibo-img").src =
    pedido.payment_method === "cash"
      ? IMG_CASH
      : pedido.receipt?.[0]?.file_url || IMG_DEFAULT;

  node.querySelector(".ver-recibo").onclick =
    () => (location.href = `/pages/shop/recibo.html?id=${pedido.id}`);

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

/* ============================================================
   EMPTY GLOBAL (SIN PEDIDOS)
============================================================ */
function showEmpty() {
  $id("pedido-activo")?.classList.add("hidden");
  $id("mis-pedidos-carrusel")?.classList.add("hidden");
  $id("empty-state")?.classList.remove("hidden");
}
/* ============================================================
   EMPTY POR FILTRO (TEXTO + IMAGEN SEGÚN ESTADO)
============================================================ */
function mostrarEmptyPorFiltro() {
  const empty = document.getElementById("empty-state");
  if (!empty) return;

  const title = empty.querySelector(".empty-title");
  const text  = empty.querySelector(".empty-text");
  const img   = empty.querySelector(".empty-illustration");

  if (!title || !text || !img) return;

  const filter = String(currentFilter || "pending").toLowerCase();

  // 🔒 BASE ABSOLUTA REAL (funciona en /pages, subcarpetas, admin, etc.)
  const BASE = window.location.origin + "/imagenes/empty/";

  const config = {
    pending: {
      t: "Todo está al día por aquí",
      d: "No tienes pedidos pendientes de revisión en este momento.",
      img: BASE + "pending.svg"
    },
    new: {
      t: "Todo está al día por aquí",
      d: "No tienes pedidos nuevos esperando aprobación.",
      img: BASE + "pending.svg"
    },
    processing: {
      t: "Nada en preparación",
      d: "En cuanto empecemos a trabajar en un pedido, aparecerá aquí.",
      img: BASE + "processing.svg"
    },
    shipped: {
      t: "Sin envíos en camino",
      d: "Tus paquetes llegarán pronto. Te avisaremos cuando salgan.",
      img: BASE + "shipped.svg"
    },
    delivered: {
      t: "¿Aún no hay entregas?",
      d: "Aquí podrás ver el historial de todos tus pedidos completados.",
      img: BASE + "delivered.svg"
    },
    cancelled: {
      t: "Sin pedidos cancelados",
      d: "¡Excelente! No tienes registros de compras canceladas.",
      img: BASE + "cancelled.svg"
    }
  };

  const state = config[filter] || config.pending;

  title.textContent = state.t;
  text.textContent  = state.d;
  img.src = state.img;
  img.alt = state.t;

  empty.classList.remove("hidden");
}
