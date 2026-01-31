/* ============================================================
   MIS PEDIDOS — CLIENTE (FINAL CORREGIDO + HISTORIAL DE NOTAS)
============================================================ */

console.log("📦 mis-pedidos.js — SISTEMA BLINDADO");

let allPedidos = [];
let pedidoActivo = null;
let __init = false;

function sb() {
  return window.supabaseClient || window.supabase || null;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return {
    fecha: d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" }),
    hora: d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* -----------------------------------------------------------
   SCROLL OPTIMIZADO (Suave y con margen superior)
----------------------------------------------------------- */
function scrollToPedidoActivo() {
  const section = document.getElementById("pedido-activo");
  if (!section) return;

  const offset = 100; // Espacio para que no pegue con el header
  const elementPosition = section.getBoundingClientRect().top + window.scrollY;
  
  window.scrollTo({
    top: elementPosition - offset,
    behavior: "smooth"
  });
}

/* -----------------------------------------------------------
   LÓGICA DE ESTADOS DINÁMICOS
----------------------------------------------------------- */
function getStatusDetails(status, paymentMethod) {
  const isCash = paymentMethod?.includes("cash");

  const maps = {
    transfer: {
      stepsNames: ["Pago enviado", "En revisión", "Confirmado", "Enviado"],
      pending: { step: 1, label: "Pago enviado" },
      payment_review: { step: 2, label: "En revisión" },
      processing: { step: 3, label: "Confirmado" },
      shipped: { step: 4, label: "Enviado" },
      delivered: { step: 4, label: "Entregado" }
    },
    cash: {
      stepsNames: ["Pedido registrado", "Preparación", "En camino", "Entregado"],
      pending: { step: 1, label: "Pedido registrado" },
      payment_review: { step: 2, label: "Preparación" },
      processing: { step: 3, label: "En camino" },
      shipped: { step: 3, label: "En camino" },
      delivered: { step: 4, label: "Entregado y Pagado" }
    }
  };

  const currentMap = isCash ? maps.cash : maps.transfer;
  const info = currentMap[status] || currentMap.pending;
  
  return { ...info, stepsNames: currentMap.stepsNames };
}

/* -----------------------------------------------------------
   INIT & LOAD
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

  // Render inicial
  await renderPedidoActivo(pedidoActivo);
  await renderCarrusel();
  bindCarruselArrows();

  document.getElementById("pedido-activo")?.classList.remove("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.remove("hidden");
}

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
   RENDER PEDIDO ACTIVO (CON DATA HISTÓRICA)
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  const node = tpl.content.cloneNode(true);
  const statusInfo = getStatusDetails(pedido.status, pedido.payment_method);

  /* 1. Header e IDs */
  node.querySelector(".pedido-numero").textContent = `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;
  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;

  /* 2. Dirección y Referencia (BLINDADO) */
  if (pedido.address_id) {
    // Solo traemos calle y ciudad de addresses
    const { data: addr } = await sb().from("addresses").select("street, city").eq("id", pedido.address_id).maybeSingle();
    if (addr) {
      node.querySelector(".entrega-text").textContent = `${addr.street}, ${addr.city}`;
    }
  }
  // La Referencia SIEMPRE viene del pedido (order_notes) para que no cambie nunca
  node.querySelector(".referencia-text").textContent = pedido.order_notes || "Sin referencia adicional";

  /* 3. Productos */
  const pillsContainer = node.querySelector(".productos-pills");
  const { data: items } = await sb().from("order_items").select("*").eq("order_id", pedido.id);
  
  if (items?.length) {
    const productIds = items.map(i => i.product_id);
    const { data: prods } = await sb().from("products").select("id, name").in("id", productIds);
    const prodMap = Object.fromEntries(prods.map(p => [p.id, p.name]));

    items.forEach(item => {
      const p = document.createElement("div");
      p.className = "pill";
      p.innerHTML = `<span>${prodMap[item.product_id] || 'Producto'} × ${item.quantity}</span> <strong>L ${(item.quantity * item.price).toFixed(2)}</strong>`;
      pillsContainer.appendChild(p);
    });
  }

  /* 4. Estado Dinámico (Título y Lista) */
  node.querySelector(".estado-paso").textContent = statusInfo.step;
  node.querySelector(".estado-nombre").textContent = statusInfo.label;

  const listaPasos = node.querySelectorAll(".estado-item");
  listaPasos.forEach((li, i) => {
    // Cambiar texto según flujo (Efectivo/Transferencia)
    const textSpan = li.querySelector(".step-text");
    if (textSpan) textSpan.textContent = statusInfo.stepsNames[i];

    const currentIdx = i + 1;
    if (currentIdx < statusInfo.step) li.classList.add("completado");
    if (currentIdx === statusInfo.step) li.classList.add("activo");
  });

  /* 5. Media (Recibo o Icono Cash) */
  const img = node.querySelector(".recibo-img");
  const btnRecibo = node.querySelector(".ver-recibo");

  if (pedido.payment_method?.includes("cash")) {
    img.src = "imagenes/pago_en_mano.svg";
    btnRecibo?.classList.add("hidden");
  } else {
    const { data: receipt } = await sb().from("payment_receipts").select("file_url").eq("order_id", pedido.id).maybeSingle();
    img.src = receipt?.file_url || "imagenes/recibo_default.svg";
    if (receipt?.file_url && btnRecibo) {
      btnRecibo.classList.remove("hidden");
      btnRecibo.onclick = () => window.location.assign(`recibo.html?id=${pedido.id}`);
    } else {
      btnRecibo?.classList.add("hidden");
    }
  }

  // Inyectar en el DOM
  container.replaceChildren(node);
  
  // Scroll suave después de un pequeño respiro para el render
  setTimeout(scrollToPedidoActivo, 150);
}

/* -----------------------------------------------------------
   CARRUSEL DE PEDIDOS
----------------------------------------------------------- */
async function renderCarrusel() {
  const wrapper = document.getElementById("pedidos-carrusel");
  const tpl = document.getElementById("pedido-carrusel-template");
  if (!wrapper || !tpl) return;

  wrapper.innerHTML = "";

  for (const pedido of allPedidos) {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".similar-card");
    const statusInfo = getStatusDetails(pedido.status, pedido.payment_method);

    node.querySelector(".pedido-mini-numero").textContent = `N.º ${String(pedido.order_number).padStart(3, "0")}`;
    node.querySelector(".pedido-mini-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;
    node.querySelector(".pedido-mini-status").textContent = statusInfo.label;

    const imgMini = node.querySelector(".pedido-mini-img");
    if (pedido.payment_method?.includes("cash")) {
      imgMini.src = "imagenes/pago_en_mano.svg";
    } else {
      const { data: rec } = await sb().from("payment_receipts").select("file_url").eq("order_id", pedido.id).maybeSingle();
      imgMini.src = rec?.file_url || "imagenes/recibo_default.svg";
    }

    if (pedido.id === pedidoActivo.id) card.classList.add("is-selected");

    card.onclick = () => {
      if (pedido.id === pedidoActivo.id) return;
      document.querySelectorAll(".similar-card").forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      pedidoActivo = pedido;
      renderPedidoActivo(pedido);
    };
    wrapper.appendChild(node);
  }
}

function bindCarruselArrows() {
  const list = document.getElementById("pedidos-carrusel");
  const prev = document.getElementById("pedidos-prev");
  const next = document.getElementById("pedidos-next");
  if (!list || !prev || !next) return;

  prev.onclick = () => list.scrollBy({ left: -300, behavior: "smooth" });
  next.onclick = () => list.scrollBy({ left: 300, behavior: "smooth" });
}

function mostrarVacio() {
  document.getElementById("pedido-activo")?.classList.add("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.add("hidden");
  document.getElementById("empty-state")?.classList.remove("hidden");
}
