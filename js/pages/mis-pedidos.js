/* ============================================================
   MIS PEDIDOS — CLIENTE (FINAL ESTABLE MOBILE + DESKTOP)
============================================================ */

console.log("📦 mis-pedidos.js — FINAL ESTABLE");

/* -----------------------------------------------------------
   STATE & HELPERS
----------------------------------------------------------- */
let allPedidos = [];
let pedidoActivo = null;
let __init = false;

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
   SCROLL SUAVE (ROBUSTO PARA MOBILE)
----------------------------------------------------------- */
function scrollToPedidoActivo() {
  const section = document.getElementById("pedido-activo");
  if (!section) return;

  const top = section.getBoundingClientRect().top + window.scrollY - 12;

  window.scrollTo({
    top,
    behavior: "smooth",
  });
}

/* -----------------------------------------------------------
   STATUS MAP
----------------------------------------------------------- */
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
  if (__init || !sb()) return;
  __init = true;

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
   LOAD
----------------------------------------------------------- */
async function loadPedidos() {
  const { data: session } = await sb().auth.getSession();
  if (!session?.session) return;

  const { data } = await sb()
    .from("orders")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: false });

  if (data?.length) {
    allPedidos = data;
    pedidoActivo = data[0];
  }
}

/* -----------------------------------------------------------
   RENDER PEDIDO ACTIVO (NO DESTRUYE DOM)
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  container.style.opacity = "0.85";

  const node = tpl.content.cloneNode(true);

  /* Header */
  node.querySelector(".pedido-numero").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent =
    `L ${Number(pedido.total).toFixed(2)}`;

  /* Dirección */
  if (pedido.address_id) {
    const { data: addr } = await sb()
      .from("addresses")
      .select("*")
      .eq("id", pedido.address_id)
      .maybeSingle();

    if (addr) {
      node.querySelector(".entrega-text").textContent =
        `${addr.street}, ${addr.city}`;
      node.querySelector(".referencia-text").textContent =
        addr.postal_code || "Sin referencia";
    }
  }

  /* Productos */
  const pills = node.querySelector(".productos-pills");
  const { data: items } = await sb()
    .from("order_items")
    .select("*")
    .eq("order_id", pedido.id);

  if (items?.length) {
    const ids = [...new Set(items.map(i => i.product_id))];
    const { data: prods } = await sb()
      .from("products")
      .select("id, name")
      .in("id", ids);

    const map = {};
    prods?.forEach(p => (map[p.id] = p.name));

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

  /* Estado */
  const status = STATUS_MAP[pedido.status] || STATUS_MAP.pending;
  node.querySelector(".estado-paso").textContent = status.step;
  node.querySelector(".estado-nombre").textContent = status.label;

  node.querySelectorAll(".estado-item").forEach((li, i) => {
    if (i + 1 < status.step) li.classList.add("completado");
    if (i + 1 === status.step) li.classList.add("activo");
  });

  /* Imagen + botón recibo */
  const img = node.querySelector(".recibo-img");
  const btn = node.querySelector(".ver-recibo");

  if (pedido.payment_method?.includes("cash")) {
    img.src = "imagenes/pago_en_mano.svg";
    btn?.classList.add("hidden");
  } else {
    const { data: receipt } = await sb()
      .from("payment_receipts")
      .select("file_url")
      .eq("order_id", pedido.id)
      .maybeSingle();

    img.src = receipt?.file_url || "imagenes/recibo_default.svg";

    if (receipt?.file_url && btn) {
      btn.classList.remove("hidden");
      btn.type = "button";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(`recibo.html?id=${pedido.id}`);
      });
    } else {
      btn?.classList.add("hidden");
    }
  }

  container.replaceChildren(node);

  requestAnimationFrame(() => {
    container.style.opacity = "1";
    scrollToPedidoActivo();
  });
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

    node.querySelector(".pedido-mini-numero").textContent =
      `N.º ${String(pedido.order_number).padStart(3, "0")}`;
    node.querySelector(".pedido-mini-total").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;
    node.querySelector(".pedido-mini-status").textContent =
      STATUS_MAP[pedido.status]?.label || "Pendiente";

    const img = node.querySelector(".pedido-mini-img");

    if (pedido.payment_method?.includes("cash")) {
      img.src = "imagenes/pago_en_mano.svg";
    } else {
      const { data: rec } = await sb()
        .from("payment_receipts")
        .select("file_url")
        .eq("order_id", pedido.id)
        .maybeSingle();

      img.src = rec?.file_url || "imagenes/recibo_default.svg";
    }

    if (pedido.id === pedidoActivo.id) {
      card.classList.add("is-selected");
    }

    card.onclick = () => {
      if (pedido.id === pedidoActivo.id) return;

      document.querySelectorAll(".similar-card")
        .forEach(c => c.classList.remove("is-selected"));

      card.classList.add("is-selected");

      pedidoActivo = pedido;
      renderPedidoActivo(pedido);
    };

    wrapper.appendChild(node);
  }
}

/* -----------------------------------------------------------
   FLECHAS
----------------------------------------------------------- */
function bindCarruselArrows() {
  const list = document.getElementById("pedidos-carrusel");
  const prev = document.getElementById("pedidos-prev");
  const next = document.getElementById("pedidos-next");
  if (!list || !prev || !next) return;

  prev.onclick = () => list.scrollBy({ left: -300, behavior: "smooth" });
  next.onclick = () => list.scrollBy({ left: 300, behavior: "smooth" });

  const toggle = () => {
    prev.style.display = list.scrollLeft > 10 ? "flex" : "none";
    next.style.display =
      list.scrollLeft + list.clientWidth < list.scrollWidth - 10
        ? "flex"
        : "none";
  };

  list.addEventListener("scroll", toggle);
  setTimeout(toggle, 300);
}

/* -----------------------------------------------------------
   EMPTY
----------------------------------------------------------- */
function mostrarVacio() {
  document.getElementById("pedido-activo")?.classList.add("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.add("hidden");
  document.getElementById("empty-state")?.classList.remove("hidden");
}
