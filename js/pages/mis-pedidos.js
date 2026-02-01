/* ============================================================
   📦 MIS PEDIDOS — UX FLUIDA (MISMA LÓGICA QUE ADMIN)
============================================================ */

console.log("📦 mis-pedidos.js — UX fluida");

const sb = () => window.supabaseClient;
let orders = [];
let activeIndex = 0;
let userSelected = false;
let autoRefresh = null;

/* ============================================================
   HELPERS
============================================================ */
const $id = (id) => document.getElementById(id);

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return {
    fecha: d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" }),
    hora: d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ============================================================
   STATUS MAP (MIS PEDIDOS)
============================================================ */
function getStatusDetails(status, paymentMethod) {
  const isCash = paymentMethod?.includes("cash");

  const maps = {
    cash: {
      steps: ["Pedido registrado", "Preparación", "En camino", "Entregado"],
      pending: { step: 1, label: "Pedido registrado", desc: "Tu pedido fue recibido correctamente." },
      processing: { step: 2, label: "Preparación", desc: "Estamos preparando tu pedido." },
      shipped: { step: 3, label: "En camino", desc: "El repartidor lleva tu pedido." },
      delivered: { step: 4, label: "Entregado", desc: "Pedido entregado y pagado." }
    },
    transfer: {
      steps: ["Pago enviado", "Revisión", "Confirmado", "Enviado"],
      pending: { step: 1, label: "Pago enviado", desc: "Estamos validando tu comprobante." },
      payment_review: { step: 2, label: "En revisión", desc: "Verificando información del pago." },
      processing: { step: 3, label: "Pago confirmado", desc: "Pedido confirmado." },
      shipped: { step: 4, label: "Enviado", desc: "Pedido en camino." },
      delivered: { step: 4, label: "Entregado", desc: "Pedido entregado." }
    }
  };

  const map = isCash ? maps.cash : maps.transfer;
  return { ...(map[status] || map.pending), steps: map.steps };
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener("header:ready", init);

async function init() {
  const { data: session } = await sb().auth.getSession();
  if (!session?.session) return;

  await loadOrders(session.session.user.id);
  renderCarousel();

  if (orders.length) {
    selectOrderByIndex(0, false);
  } else {
    showEmpty();
  }

  startAutoRefresh(session.session.user.id);
}

/* ============================================================
   LOAD ORDERS (SOLO UNA QUERY)
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
   AUTO REFRESH (NO BLOQUEA UI)
============================================================ */
function startAutoRefresh(userId) {
  clearInterval(autoRefresh);
  autoRefresh = setInterval(async () => {
    await loadOrders(userId);
    renderCarousel();
    selectOrderByIndex(activeIndex, true);
  }, 30000);
}

/* ============================================================
   CARRUSEL (PRIMERO)
============================================================ */
function renderCarousel() {
  const wrap = $id("pedidos-carrusel");
  const tpl = $id("pedido-carrusel-template");
  wrap.innerHTML = "";

  orders.forEach((o, index) => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".similar-card");

    node.querySelector(".pedido-mini-numero").textContent =
      `N.º ${String(o.order_number).padStart(3, "0")}`;
    node.querySelector(".pedido-mini-total").textContent =
      `L ${Number(o.total).toFixed(2)}`;

    const status = getStatusDetails(o.status, o.payment_method);
    node.querySelector(".pedido-mini-status").textContent = status.label;

    const img = node.querySelector(".pedido-mini-img");
    img.src =
      o.payment_method?.includes("cash")
        ? "imagenes/pago_en_mano.svg"
        : o.receipt?.[0]?.file_url || "imagenes/recibo_default.svg";

    if (index === activeIndex) card.classList.add("is-selected");

    card.onclick = () => {
      userSelected = true;
      selectOrderByIndex(index);
    };

    wrap.appendChild(node);
  });

  bindCarouselArrows();
}

/* ============================================================
   SELECT ORDER (IGUAL QUE ADMIN)
============================================================ */
function selectOrderByIndex(index, silent = false) {
  if (!orders[index]) return;

  activeIndex = index;
  applySelection();
  renderPedidoActivo(orders[index]);

  if (userSelected && !silent) {
    scrollToPedidoActivo();
    userSelected = false;
  }
}

function applySelection() {
  document
    .querySelectorAll(".similar-card")
    .forEach(c => c.classList.remove("is-selected"));

  document
    .querySelectorAll(".similar-card")
    [activeIndex]?.classList.add("is-selected");
}

/* ============================================================
   PEDIDO ACTIVO (NO BLOQUEA)
============================================================ */
function renderPedidoActivo(pedido) {
  const container = $id("pedido-activo");
  const tpl = $id("pedido-activo-template");
  container.innerHTML = "";

  const node = tpl.content.cloneNode(true);
  const status = getStatusDetails(pedido.status, pedido.payment_method);
  const { fecha, hora } = formatDateTime(pedido.created_at);

  node.querySelector(".pedido-numero").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent =
    `L ${Number(pedido.total).toFixed(2)}`;

  node.querySelector(".entrega-text").textContent =
    pedido.address
      ? `${pedido.address.street}, ${pedido.address.city}`
      : "—";

  node.querySelector(".referencia-text").textContent =
    pedido.order_notes || "Sin referencia adicional";

  node.querySelector(".estado-nombre").textContent = status.label;
  node.querySelector(".estado-descripcion").textContent = status.desc;
  node.querySelector(".estado-paso").textContent = status.step;

  const pasos = node.querySelectorAll(".estado-item");
  pasos.forEach((li, i) => {
    li.querySelector(".step-text").textContent = status.steps[i];
    if (i + 1 < status.step) li.classList.add("completado");
    if (i + 1 === status.step) li.classList.add("activo");
  });

  const pills = node.querySelector(".productos-pills");
  pedido.items?.forEach(item => {
    const p = document.createElement("div");
    p.className = "pill";
    p.innerHTML = `
      <span>${item.products?.name} × ${item.quantity}</span>
      <strong>L ${(item.quantity * item.price).toFixed(2)}</strong>
    `;
    pills.appendChild(p);
  });

  const img = node.querySelector(".recibo-img");
  img.src =
    pedido.payment_method?.includes("cash")
      ? "imagenes/pago_en_mano.svg"
      : pedido.receipt?.[0]?.file_url || "imagenes/recibo_default.svg";

  node.querySelector(".ver-recibo").onclick =
    () => window.location.href = `recibo.html?id=${pedido.id}`;

  container.appendChild(node);
}

/* ============================================================
   SCROLL SUAVE (NO BLOQUEA)
============================================================ */
function scrollToPedidoActivo() {
  const el = $id("pedido-activo");
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* ============================================================
   CARRUSEL ARROWS
============================================================ */
function bindCarouselArrows() {
  const list = $id("pedidos-carrusel");
  $id("pedidos-prev").onclick = () =>
    list.scrollBy({ left: -300, behavior: "smooth" });
  $id("pedidos-next").onclick = () =>
    list.scrollBy({ left: 300, behavior: "smooth" });
}

/* ============================================================
   EMPTY
============================================================ */
function showEmpty() {
  $id("pedido-activo")?.classList.add("hidden");
  $id("mis-pedidos-carrusel")?.classList.add("hidden");
  $id("empty-state")?.classList.remove("hidden");
}
