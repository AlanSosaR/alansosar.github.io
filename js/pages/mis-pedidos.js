/* ============================================================
   Mis pedidos — Café Cortero
   CLIENTE (HTML FINAL CORREGIDO)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL CORREGIDO");

/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
let allPedidos = [];
let pedidoActivo = null;
let __misPedidosInit = false;

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

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

/* -----------------------------------------------------------
   ESTADOS (CLIENTE)
----------------------------------------------------------- */
const STATUS_FLOW = ["pagado", "revision", "confirmado", "envio"];

const STATUS_MAP = {
  pending: {
    step: 1,
    label: "Pendiente de pago",
  },
  payment_review: {
    step: 2,
    label: "Pago en revisión",
  },
  processing: {
    step: 3,
    label: "Confirmado",
  },
  shipped: {
    step: 4,
    label: "Enviado",
  },
  delivered: {
    step: 4,
    label: "Entregado",
  },
};

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("header:ready", init);

async function init() {
  if (__misPedidosInit) return;
  __misPedidosInit = true;

  const sb = getSupabaseClient();
  if (!sb) return;

  await loadPedidosCliente();

  if (!pedidoActivo) {
    mostrarVacio();
    return;
  }

  renderCliente();
  bindCarruselArrows();
}

/* -----------------------------------------------------------
   LOAD PEDIDOS
----------------------------------------------------------- */
async function loadPedidosCliente() {
  const sb = getSupabaseClient();
  const { data: session } = await sb.auth.getSession();
  if (!session?.session) return;

  const { data } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: false });

  if (!Array.isArray(data) || !data.length) return;

  allPedidos = data;
  pedidoActivo = data[0];
}

/* -----------------------------------------------------------
   RENDER GENERAL
----------------------------------------------------------- */
function renderCliente() {
  renderPedidoActivo(pedidoActivo);
  renderCarrusel();

  document.getElementById("pedido-activo")?.classList.remove("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.remove("hidden");
}

/* -----------------------------------------------------------
   PEDIDO ACTIVO
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  container.innerHTML = "";
  const node = tpl.content.cloneNode(true);
  const sb = getSupabaseClient();

  /* HEADER */
  node.querySelector(".pedido-numero").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;

  /* TOTAL */
  node.querySelector(".pedido-total").textContent =
    `L ${Number(pedido.total).toFixed(2)}`;

  /* ENTREGA / REFERENCIA */
  node.querySelector(".entrega-text").textContent = pedido.address || "—";
  node.querySelector(".referencia-text").textContent = pedido.reference || "—";

  /* PRODUCTOS */
  const pills = node.querySelector(".productos-pills");
  pills.innerHTML = "";

  const { data: items } = await sb
    .from("order_items")
    .select("product_id, quantity, price")
    .eq("order_id", pedido.id);

  if (Array.isArray(items) && items.length) {
    const ids = [...new Set(items.map(i => i.product_id))];

    const { data: products } = await sb
      .from("products")
      .select("id, name")
      .in("id", ids);

    const productMap = {};
    products?.forEach(p => (productMap[p.id] = p.name));

    items.forEach(i => {
      const row = document.createElement("div");
      row.className = "pill";
      row.innerHTML = `
        <span>${productMap[i.product_id] || "Producto"} × ${i.quantity}</span>
        <span>L ${(i.quantity * i.price).toFixed(2)}</span>
      `;
      pills.appendChild(row);
    });
  }

  /* ESTADO */
  const status = STATUS_MAP[pedido.status] || STATUS_MAP.pending;

  node.querySelector(".estado-paso").textContent = status.step;
  node.querySelector(".estado-nombre").textContent = status.label;

  node.querySelectorAll(".estado-item").forEach(li => {
    li.classList.remove("activo", "completado");
    li.classList.add("hidden");
  });

  STATUS_FLOW.forEach((key, idx) => {
    const li = node.querySelector(`[data-estado="${key}"]`);
    if (!li) return;
    li.classList.remove("hidden");
    if (idx + 1 < status.step) li.classList.add("completado");
    if (idx + 1 === status.step) li.classList.add("activo");
  });

  /* MEDIA / IMAGEN */
  const img = node.querySelector(".recibo-img");
  const btn = node.querySelector(".ver-recibo");

  btn.classList.add("hidden");

  if (
    pedido.payment_method === "cash" ||
    pedido.payment_method === "cash_on_delivery"
  ) {
    img.src = "imagenes/pago_en_mano.svg";
  } else {
    const { data: receipt } = await sb
      .from("payment_receipts")
      .select("file_url")
      .eq("order_id", pedido.id)
      .maybeSingle();

    if (receipt?.file_url) {
      img.src = receipt.file_url;
      btn.classList.remove("hidden");
      btn.onclick = () => {
        location.href = `recibo.html?id=${pedido.id}`;
      };
    } else {
      img.src = "imagenes/pago_en_mano.svg";
    }
  }

  container.appendChild(node);

  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* -----------------------------------------------------------
   CARRUSEL
----------------------------------------------------------- */
function renderCarrusel() {
  const wrapper = document.getElementById("pedidos-carrusel");
  const tpl = document.getElementById("pedido-carrusel-template");
  if (!wrapper || !tpl) return;

  wrapper.innerHTML = "";

  allPedidos.forEach(pedido => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".pedido-mini-card");

    node.querySelector(".pedido-mini-numero").textContent =
      `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

    node.querySelector(".pedido-mini-total").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;

    node.querySelector(".pedido-mini-status").textContent =
      STATUS_MAP[pedido.status]?.label || "Pendiente";

    const img = node.querySelector(".pedido-mini-img");

    img.src =
      pedido.payment_method === "cash" ||
      pedido.payment_method === "cash_on_delivery"
        ? "imagenes/pago_en_mano.svg"
        : "imagenes/recibo_default.svg";

    if (pedido.id === pedidoActivo.id) {
      card.classList.add("is-selected");
    }

    card.onclick = () => {
      document
        .querySelectorAll(".pedido-mini-card")
        .forEach(c => c.classList.remove("is-selected"));

      card.classList.add("is-selected");
      pedidoActivo = pedido;
      renderPedidoActivo(pedido);
    };

    wrapper.appendChild(node);
  });
}

/* -----------------------------------------------------------
   FLECHAS CARRUSEL
----------------------------------------------------------- */
function bindCarruselArrows() {
  if (window.innerWidth < 900) return;

  const list = document.getElementById("pedidos-carrusel");
  const prev = document.getElementById("pedidos-prev");
  const next = document.getElementById("pedidos-next");
  if (!list || !prev || !next) return;

  const STEP = list.clientWidth * 0.9;

  prev.onclick = () => list.scrollBy({ left: -STEP, behavior: "smooth" });
  next.onclick = () => list.scrollBy({ left: STEP, behavior: "smooth" });
}

/* -----------------------------------------------------------
   EMPTY STATE
----------------------------------------------------------- */
function mostrarVacio() {
  document.getElementById("pedido-activo")?.classList.add("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.add("hidden");
  document.getElementById("empty-state")?.classList.remove("hidden");
}
