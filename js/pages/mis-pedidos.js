/* ============================================================
   Mis pedidos — Café Cortero
   CLIENTE + ADMIN (MISMO HTML)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL");

/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
let allPedidos = [];
let pedidoActivo = null;
let isAdmin = false;
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
   ESTADOS (BACKEND → UI)
----------------------------------------------------------- */
const STATUS_FLOW = ["pagado", "revision", "confirmado", "envio"];

const STATUS_MAP = {
  pending: {
    step: 1,
    label: "Pendiente de pago",
    description:
      "Estamos esperando tu comprobante de pago para continuar con tu pedido.",
  },
  pending_payment: {
    step: 1,
    label: "Pendiente de pago",
    description:
      "Estamos esperando tu comprobante de pago para continuar con tu pedido.",
  },
  payment_review: {
    step: 2,
    label: "Pago en revisión",
    description: "Estamos verificando tu comprobante de pago.",
  },
  payment_confirmed: {
    step: 3,
    label: "Pago confirmado",
    description: "Tu pedido ha sido confirmado y será preparado.",
  },
  processing: {
    step: 3,
    label: "Pedido confirmado",
    description: "Estamos preparando tu pedido.",
  },
  shipped: {
    step: 4,
    label: "Enviado",
    description: "Tu pedido va en camino.",
  },
  delivered: {
    step: 4,
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

async function init() {
  if (__misPedidosInit) return;
  __misPedidosInit = true;

  const sb = getSupabaseClient();
  if (!sb) return;

  await detectMode();

  if (isAdmin) {
    const admin = await import("../admin/admin_pedidos.js");
    admin.init();
    return;
  }

  await loadPedidosCliente();

  if (!pedidoActivo) {
    mostrarVacio();
    return;
  }

  renderCliente();
}

/* -----------------------------------------------------------
   DETECTAR ADMIN
----------------------------------------------------------- */
async function detectMode() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const params = new URLSearchParams(location.search);
  if (params.get("mode") !== "admin") return;

  const { data } = await sb.auth.getSession();
  if (!data?.session) return;

  const { data: user } = await sb
    .from("users")
    .select("rol")
    .eq("id", data.session.user.id)
    .single();

  isAdmin = user?.rol === "admin";
}

/* -----------------------------------------------------------
   LOAD PEDIDOS CLIENTE
----------------------------------------------------------- */
async function loadPedidosCliente() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data: session } = await sb.auth.getSession();
  if (!session?.session) return;

  const { data } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: false });

  if (!Array.isArray(data) || data.length === 0) return;

  allPedidos = data;
  pedidoActivo = data[0];
}

/* -----------------------------------------------------------
   RENDER CLIENTE
----------------------------------------------------------- */
function renderCliente() {
  renderPedidoActivo(pedidoActivo);
  renderCarrusel();
}

/* -----------------------------------------------------------
   RENDER PEDIDO ACTIVO
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  container.innerHTML = "";
  const node = tpl.content.cloneNode(true);
  const sb = getSupabaseClient();

  node.querySelector(".pedido-numero").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;

  node.querySelector(".pedido-total strong").textContent =
    `L ${Number(pedido.total).toFixed(2)}`;

  /* PRODUCTOS */
  const pills = node.querySelector(".productos-pills");
  pills.innerHTML = "";

  const { data: items } = await sb
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", pedido.id);

  if (Array.isArray(items) && items.length > 0) {
    const productIds = [...new Set(items.map(i => i.product_id))];

    const { data: products } = await sb
      .from("products")
      .select("id, name")
      .in("id", productIds);

    const map = {};
    (products || []).forEach(p => (map[p.id] = p.name));

    items.forEach(i => {
      const span = document.createElement("span");
      span.className = "pill";
      span.textContent = `${map[i.product_id] || "Producto"} × ${i.quantity}`;
      pills.appendChild(span);
    });
  }

  /* ESTADO */
  const status = STATUS_MAP[pedido.status] || STATUS_MAP.pending;

  node.querySelector(".estado-paso").textContent =
    status.cancelled ? "—" : status.step;

  node.querySelector(".estado-nombre").textContent = status.label;
  node.querySelector(".estado-descripcion").textContent = status.description;

  const estados = node.querySelectorAll(".estado-item");
  estados.forEach(li => {
    li.classList.remove("activo", "completado");
    li.classList.add("hidden");
  });

  if (!status.cancelled) {
    STATUS_FLOW.forEach((key, index) => {
      const li = node.querySelector(`[data-estado="${key}"]`);
      if (!li) return;
      li.classList.remove("hidden");
      if (index + 1 < status.step) li.classList.add("completado");
      if (index + 1 === status.step) li.classList.add("activo");
    });
  }

  /* COMPROBANTE */
  const img = node.querySelector(".comprobante-img");
  const label = node.querySelector(".comprobante-label");
  const btn = node.querySelector(".ver-recibo");

  if (img && label && btn) {
    if (
      pedido.payment_method === "cash" ||
      pedido.payment_method === "cash_on_delivery"
    ) {
      img.src = "imagenes/pago_en_mano.svg";
      img.classList.remove("hidden");
      label.textContent = "Pago al recibir";
      btn.classList.add("hidden");
    } else {
      const { data: receipt } = await sb
        .from("payment_receipts")
        .select("file_url")
        .eq("order_id", pedido.id)
        .maybeSingle();

      if (receipt?.file_url) {
        img.src = receipt.file_url;
        img.classList.remove("hidden");
        label.textContent = "Comprobante de pago";
        btn.classList.remove("hidden");
      } else {
        img.src = "imagenes/pago_en_mano.svg";
        img.classList.remove("hidden");
        label.textContent = "Pendiente de comprobante";
        btn.classList.add("hidden");
      }
    }
  }

  btn?.addEventListener("click", () => {
    location.href = `recibo.html?id=${pedido.id}`;
  });

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
