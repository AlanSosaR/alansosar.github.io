/* ============================================================
   MIS PEDIDOS — CLIENTE (CORREGIDO)
============================================================ */

console.log("📦 mis-pedidos.js — Estructura Material 3 Garantizada");

/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
let allPedidos = [];
let pedidoActivo = null;
let __init = false;

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */
function sb() {
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
   ESTADOS
----------------------------------------------------------- */
const STATUS_FLOW = ["pagado", "revision", "confirmado", "envio"];

const STATUS_MAP = {
  pending: { step: 1, label: "Pendiente de pago" },
  payment_review: { step: 2, label: "Pago en revisión" },
  processing: { step: 3, label: "Confirmado" },
  shipped: { step: 4, label: "Enviado" },
  delivered: { step: 4, label: "Entregado" },
};

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("header:ready", init);

async function init() {
  if (__init) return;
  __init = true;

  if (!sb()) return;

  await loadPedidos();

  if (!pedidoActivo) {
    mostrarVacio();
    return;
  }

  await renderPedidoActivo(pedidoActivo);
  await renderCarrusel();
  bindCarruselArrows();

  document.getElementById("pedido-activo")?.classList.remove("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.remove("hidden");
}

/* -----------------------------------------------------------
   LOAD PEDIDOS
----------------------------------------------------------- */
async function loadPedidos() {
  const { data: session } = await sb().auth.getSession();
  if (!session?.session) return;

  const { data } = await sb()
    .from("orders")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: false });

  if (!data?.length) return;

  allPedidos = data;
  pedidoActivo = data[0];
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

  // HEADER
  node.querySelector(".pedido-numero").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;

  // TOTAL
  node.querySelector(".pedido-total").textContent =
    `L ${Number(pedido.total).toFixed(2)}`;

  // ENTREGA / REFERENCIA
  const entregaEl = node.querySelector(".entrega-text");
  const referenciaEl = node.querySelector(".referencia-text");

  if (pedido.address_id) {
    const { data: address } = await sb()
      .from("addresses")
      .select("street, city, state, country, postal_code")
      .eq("id", pedido.address_id)
      .maybeSingle();

    if (address) {
      entregaEl.textContent = `${address.street}, ${address.city}`;
      referenciaEl.textContent = address.postal_code || "Sin referencia";
    }
  }

  // PRODUCTOS (Pills)
  const pills = node.querySelector(".productos-pills");
  pills.innerHTML = "";

  const { data: items } = await sb()
    .from("order_items")
    .select("product_id, quantity, price")
    .eq("order_id", pedido.id);

  if (items?.length) {
    const ids = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await sb().from("products").select("id, name").in("id", ids);
    const map = {};
    products?.forEach(p => (map[p.id] = p.name));

    items.forEach(i => {
      const div = document.createElement("div");
      div.className = "pill";
      div.innerHTML = `
        <span>${map[i.product_id] || "Producto"} × ${i.quantity}</span>
        <strong>L ${(i.quantity * i.price).toFixed(2)}</strong>
      `;
      pills.appendChild(div);
    });
  }

  // ESTADO
  const status = STATUS_MAP[pedido.status] || STATUS_MAP.pending;
  node.querySelector(".estado-paso").textContent = status.step;
  node.querySelector(".estado-nombre").textContent = status.label;

  const listItems = node.querySelectorAll(".estado-item");
  listItems.forEach((li, i) => {
    const stepIdx = i + 1;
    if (stepIdx < status.step) li.classList.add("completado");
    if (stepIdx === status.step) li.classList.add("activo");
  });

  // MEDIA / BOTÓN RECIBO (Blindaje CSS)
  const img = node.querySelector(".recibo-img");
  const btn = node.querySelector(".ver-recibo");
  
  if (pedido.payment_method?.includes("cash")) {
    img.src = "imagenes/pago_en_mano.svg";
    btn.classList.add("hidden");
  } else {
    const { data: receipt } = await sb()
      .from("payment_receipts")
      .select("file_url")
      .eq("order_id", pedido.id)
      .maybeSingle();

    if (receipt?.file_url) {
      img.src = receipt.file_url;
      btn.classList.remove("hidden");
      // Forzamos estructura interna para que el CSS de la "píldora" funcione
      btn.innerHTML = `
        <span class="material-symbols-outlined">receipt_long</span>
        <span>Ver recibo</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      `;
      btn.onclick = () => (location.href = `recibo.html?id=${pedido.id}`);
    } else {
      img.src = "imagenes/recibo_default.svg";
      btn.classList.add("hidden");
    }
  }

  container.appendChild(node);
}

/* -----------------------------------------------------------
   CARRUSEL
----------------------------------------------------------- */
async function renderCarrusel() {
  const wrapper = document.getElementById("pedidos-carrusel");
  const tpl = document.getElementById("pedido-carrusel-template");
  if (!wrapper || !tpl) return;

  wrapper.innerHTML = "";

  for (const pedido of allPedidos) {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".similar-card");

    node.querySelector(".pedido-mini-numero").textContent = `N.º ${String(pedido.order_number).padStart(3, "0")}`;
    node.querySelector(".pedido-mini-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;
    
    const statusEl = node.querySelector(".pedido-mini-status");
    statusEl.textContent = STATUS_MAP[pedido.status]?.label || "Pendiente";

    // Imagen mini
    const img = node.querySelector(".pedido-mini-img");
    if (pedido.payment_method?.includes("cash")) {
      img.src = "imagenes/pago_en_mano.svg";
    } else {
      const { data: rec } = await sb().from("payment_receipts").select("file_url").eq("order_id", pedido.id).maybeSingle();
      img.src = rec?.file_url || "imagenes/recibo_default.svg";
    }

    if (pedido.id === pedidoActivo.id) card.classList.add("is-selected");

    card.onclick = () => {
      document.querySelectorAll(".similar-card").forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      pedidoActivo = pedido;
      renderPedidoActivo(pedido);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    wrapper.appendChild(node);
  }
}

/* -----------------------------------------------------------
   FLECHAS CARRUSEL
----------------------------------------------------------- */
function bindCarruselArrows() {
  const list = document.getElementById("pedidos-carrusel");
  const prev = document.getElementById("pedidos-prev");
  const next = document.getElementById("pedidos-next");

  if (!list || !prev || !next) return;

  const scrollAmount = 300;

  prev.onclick = () => list.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  next.onclick = () => list.scrollBy({ left: scrollAmount, behavior: "smooth" });

  // Ocultar flechas si no hay scroll (Desktop)
  const toggleArrows = () => {
    prev.style.display = list.scrollLeft <= 0 ? "none" : "flex";
    next.style.display = list.scrollLeft + list.clientWidth >= list.scrollWidth ? "none" : "flex";
  };

  list.addEventListener("scroll", toggleArrows);
  window.addEventListener("resize", toggleArrows);
  setTimeout(toggleArrows, 500);
}

/* -----------------------------------------------------------
   EMPTY STATE
----------------------------------------------------------- */
function mostrarVacio() {
  document.getElementById("pedido-activo")?.classList.add("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.add("hidden");
  document.getElementById("empty-state")?.classList.remove("hidden");
}
