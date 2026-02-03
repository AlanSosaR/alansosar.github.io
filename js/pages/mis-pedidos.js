/* ============================================================
   📦 MIS PEDIDOS — UX FLUIDA (FINAL BLINDADO)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL BLINDADO");

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
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) throw new Error("Fecha inválida");
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
  try {
    await esperarSupabase();

    const { data, error } = await sb().auth.getSession();
    if (error || !data?.session) return;

    await loadOrders(data.session.user.id);

    if (!orders.length) {
      showGlobalEmpty();
      return;
    }

    bindHeaderEvents();
    applyLocalFilters();
    startAutoRefresh(data.session.user.id);
  } catch (err) {
    console.error("❌ Error init mis-pedidos:", err);
  }
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
  cancelled: ["cancelled"],
};

function applyLocalFilters() {
  try {
    filteredOrders = orders.filter((o) => {
      const matchStatus =
        STATUS_FILTER_MAP[currentFilter]?.includes(o.status) ?? true;

      let matchSearch = true;
      if (currentSearch) {
        const byNumber =
          normalizeOrderNumber(o.order_number).includes(currentSearch);

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
  } catch (err) {
    console.error("❌ Error filtros:", err);
  }
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
  try {
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
        receipt:payment_receipts ( file_url ),
        items:order_items (
          quantity,
          price,
          products ( name )
        )
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    orders = data || [];
  } catch (err) {
    console.error("❌ Error cargando pedidos:", err);
    orders = [];
  }
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
    try {
      const node = tpl.content.cloneNode(true);
      const card = node.querySelector(".similar-card");

      node.querySelector(".pedido-mini-numero").textContent =
        `N.º ${normalizeOrderNumber(o.order_number)}`;
      node.querySelector(".pedido-mini-total").textContent =
        `L ${Number(o.total).toFixed(2)}`;

      node.querySelector(".pedido-mini-status").textContent =
        getStatusDetails(o.status, o.payment_method).label;

      node.querySelector(".pedido-mini-img").src =
        o.payment_method === "cash"
          ? IMG_CASH
          : o.receipt?.[0]?.file_url || IMG_DEFAULT;

      card.onclick = () => selectOrder(index);
      wrap.appendChild(node);
    } catch (err) {
      console.warn("⚠️ Error render card:", err);
    }
  });

  bindCarouselArrows();
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
    $id("pedido-activo")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

/* ============================================================
   PEDIDO ACTIVO
============================================================ */
function renderPedidoActivo(pedido) {
  try {
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
    node.querySelector(".pedido-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;
    node.querySelector(".estado-nombre").textContent = status.label;
    node.querySelector(".estado-descripcion").textContent = status.desc;

    const stepsWrap = node.querySelector(".estado-steps");
    if (stepsWrap) {
      stepsWrap.innerHTML = "";
      status.steps.forEach((_, i) => {
        const s = document.createElement("span");
        s.className = "estado-step";
        if (i + 1 <= status.step) s.classList.add("active");
        s.textContent = i + 1;
        stepsWrap.appendChild(s);
      });
    }

    container.appendChild(node);
  } catch (err) {
    console.error("❌ Error render pedido activo:", err);
  }
}

/* ============================================================
   ARROWS
============================================================ */
function bindCarouselArrows() {
  const list = $id("pedidos-carrusel");
  $id("pedidos-prev")?.addEventListener("click", () =>
    list?.scrollBy({ left: -300, behavior: "smooth" })
  );
  $id("pedidos-next")?.addEventListener("click", () =>
    list?.scrollBy({ left: 300, behavior: "smooth" })
  );
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
