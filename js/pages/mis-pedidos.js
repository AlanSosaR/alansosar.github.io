/* ============================================================
   Mis pedidos — Café Cortero
   CLIENTE + ADMIN (MISMO HTML)
============================================================ */

console.log("📦 mis-pedidos.js — CLIENTE / ADMIN");

/* -----------------------------------------------------------
   CONFIG
----------------------------------------------------------- */
let allPedidos = [];
let pedidoActivo = null;
let isAdmin = false;

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
   MAPEO DE ESTADOS (BACKEND → UI)
----------------------------------------------------------- */
const STATUS_FLOW = ["pagado", "revision", "confirmado", "envio"];

const STATUS_MAP = {
  pending_payment: {
    step: 1,
    key: "pagado",
    label: "Pendiente de pago",
    description: "Estamos esperando tu comprobante de pago para continuar con tu pedido.",
  },
  payment_review: {
    step: 2,
    key: "revision",
    label: "Pago en revisión",
    description: "Estamos verificando tu comprobante de pago.",
  },
  payment_confirmed: {
    step: 3,
    key: "confirmado",
    label: "Pago confirmado",
    description: "Tu pedido ha sido confirmado y será preparado.",
  },
  processing: {
    step: 3,
    key: "confirmado",
    label: "Pedido confirmado",
    description: "Estamos preparando tu pedido.",
  },
  shipped: {
    step: 4,
    key: "envio",
    label: "Enviado",
    description: "Tu pedido va en camino.",
  },
  delivered: {
    step: 4,
    key: "envio",
    label: "Entregado",
    description: "Tu pedido fue entregado.",
  },
  cancelled: {
    cancelled: true,
    label: "Cancelado",
    description: "Este pedido fue cancelado.",
  },
};

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("header:ready", init);
init();

async function init() {
  await detectMode();

  if (isAdmin) {
    const admin = await import("../admin/admin_pedidos.js");
    admin.init();
    return;
  }

  await loadPedidosCliente();
  renderCliente();
}

/* -----------------------------------------------------------
   DETECTAR MODO
----------------------------------------------------------- */
async function detectMode() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const params = new URLSearchParams(location.search);
  if (params.get("mode") !== "admin") return;

  const { data: session } = await sb.auth.getSession();
  if (!session?.session) return;

  const { data: user } = await sb
    .from("users")
    .select("rol")
    .eq("id", session.session.user.id)
    .single();

  isAdmin = user?.rol === "admin";
}

/* -----------------------------------------------------------
   CARGAR PEDIDOS CLIENTE
----------------------------------------------------------- */
async function loadPedidosCliente() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data: session } = await sb.auth.getSession();
  if (!session?.session) {
    mostrarVacio();
    return;
  }

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    mostrarVacio();
    return;
  }

  allPedidos = data;
  pedidoActivo = allPedidos[0]; // 🔥 el más reciente
}

/* -----------------------------------------------------------
   RENDER CLIENTE
----------------------------------------------------------- */
function renderCliente() {
  if (!pedidoActivo) {
    mostrarVacio();
    return;
  }

  renderPedidoActivo(pedidoActivo);
  renderCarrusel();
}

/* -----------------------------------------------------------
   RENDER PEDIDO ACTIVO (TARJETA GRANDE)
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  container.innerHTML = "";
  const node = tpl.content.cloneNode(true);

  /* Número */
  node.querySelector(".pedido-numero").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  /* Fecha / hora */
  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;

  /* Total */
  node.querySelector(".pedido-total strong").textContent =
    `L ${Number(pedido.total).toFixed(2)}`;

  /* Productos (píldoras) */
  const pills = node.querySelector(".productos-pills");
  pills.innerHTML = "";

  const sb = getSupabaseClient();
  const { data: items } = await sb
    .from("order_items")
    .select("quantity, product_name")
    .eq("order_id", pedido.id);

  items?.forEach(i => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = `${i.product_name} × ${i.quantity}`;
    pills.appendChild(span);
  });

  /* ---------------------------
     ESTADO VERTICAL
  --------------------------- */
  const statusInfo = STATUS_MAP[pedido.status] || STATUS_MAP.pending_payment;

  const pasoEl = node.querySelector(".estado-paso");
  const nombreEl = node.querySelector(".estado-nombre");
  const descEl = node.querySelector(".estado-descripcion");

  const itemsEstado = node.querySelectorAll(".estado-item");

  // Reset
  itemsEstado.forEach(li => {
    li.classList.remove("activo", "completado");
    li.classList.add("hidden");
  });

  if (statusInfo.cancelled) {
    const cancelado = node.querySelector(".estado-cancelado");
    cancelado.classList.remove("hidden");
    nombreEl.textContent = statusInfo.label;
    pasoEl.textContent = "—";
    descEl.textContent = statusInfo.description;
  } else {
    nombreEl.textContent = statusInfo.label;
    pasoEl.textContent = statusInfo.step;
    descEl.textContent = statusInfo.description;

    STATUS_FLOW.forEach((key, index) => {
      const li = node.querySelector(`[data-estado="${key}"]`);
      if (!li) return;

      li.classList.remove("hidden");

      if (index + 1 < statusInfo.step) {
        li.classList.add("completado");
      } else if (index + 1 === statusInfo.step) {
        li.classList.add("activo");
      }
    });
  }

  /* Ver recibo */
  node.querySelector(".ver-recibo").onclick = () => {
    location.href = `recibo.html?id=${pedido.id}`;
  };

  container.appendChild(node);
}

/* -----------------------------------------------------------
   RENDER CARRUSEL
----------------------------------------------------------- */
function renderCarrusel() {
  const wrapper = document.getElementById("pedidos-carrusel");
  const tpl = document.getElementById("pedido-carrusel-template");
  if (!wrapper || !tpl) return;

  wrapper.innerHTML = "";

  allPedidos.slice(1).forEach(pedido => {
    const node = tpl.content.cloneNode(true);

    node.querySelector(".pedido-mini-numero").textContent =
      `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

    node.querySelector(".pedido-mini-total").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;

    node.querySelector(".pedido-mini-status").textContent =
      STATUS_MAP[pedido.status]?.label || "Pendiente";

    node.querySelector(".pedido-mini-card").onclick = () => {
      pedidoActivo = pedido;
      renderCliente();
    };

    wrapper.appendChild(node);
  });
}

/* -----------------------------------------------------------
   EMPTY STATE
----------------------------------------------------------- */
function mostrarVacio() {
  document.getElementById("pedido-activo")?.replaceChildren();
  document.getElementById("pedidos-carrusel")?.replaceChildren();
  document.getElementById("empty-state")?.classList.remove("hidden");
}
