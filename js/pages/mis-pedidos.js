/* ============================================================
   MIS PEDIDOS — CLIENTE (FINAL DINÁMICO + SCROLL OPTIMIZADO)
============================================================ */

console.log("📦 mis-pedidos.js — ACTUALIZADO");

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
   SCROLL OPTIMIZADO (Rápido pero fluido)
----------------------------------------------------------- */
function scrollToPedidoActivo() {
  const section = document.getElementById("pedido-activo");
  if (!section) return;

  // Calculamos la posición con un pequeño margen superior
  const offset = 80; 
  const elementPosition = section.getBoundingClientRect().top + window.scrollY;
  
  window.scrollTo({
    top: elementPosition - offset,
    behavior: "smooth" // Mantiene la fluidez sin ser excesivamente lento
  });
}

/* -----------------------------------------------------------
   LÓGICA DE ESTADOS Y NOMBRES DINÁMICOS
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
  if (!pedidoActivo) { mostrarVacio(); return; }

  renderPedidoActivo(pedidoActivo);
  renderCarrusel();
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
   RENDER PEDIDO ACTIVO
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  const node = tpl.content.cloneNode(true);
  const statusInfo = getStatusDetails(pedido.status, pedido.payment_method);

  // Datos Básicos
  node.querySelector(".pedido-numero").textContent = `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;
  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;

  // Dirección y Referencia
  if (pedido.address_id) {
    const { data: addr } = await sb().from("addresses").select("*").eq("id", pedido.address_id).maybeSingle();
    if (addr) {
      node.querySelector(".entrega-text").textContent = `${addr.street}, ${addr.city}`;
      node.querySelector(".referencia-text").textContent = addr.postal_code || "Sin referencia";
    }
  }

  // Estado Dinámico (Título y Pasos)
  node.querySelector(".estado-paso").textContent = statusInfo.step;
  node.querySelector(".estado-nombre").textContent = statusInfo.label;

  const itemsLista = node.querySelectorAll(".estado-item");
  itemsLista.forEach((li, i) => {
    // Cambiamos el texto del paso dinámicamente
    const textSpan = li.querySelector(".step-text");
    if (textSpan) textSpan.textContent = statusInfo.stepsNames[i];

    const stepIdx = i + 1;
    if (stepIdx < statusInfo.step) li.classList.add("completado");
    if (stepIdx === statusInfo.step) li.classList.add("activo");
  });

  // Imagen y Recibo
  const img = node.querySelector(".recibo-img");
  const btn = node.querySelector(".ver-recibo");

  if (pedido.payment_method?.includes("cash")) {
    img.src = "imagenes/pago_en_mano.svg";
    btn?.classList.add("hidden");
  } else {
    const { data: receipt } = await sb().from("payment_receipts").select("file_url").eq("order_id", pedido.id).maybeSingle();
    img.src = receipt?.file_url || "imagenes/recibo_default.svg";
    if (receipt?.file_url && btn) {
      btn.classList.remove("hidden");
      btn.onclick = () => window.location.assign(`recibo.html?id=${pedido.id}`);
    } else { btn?.classList.add("hidden"); }
  }

  // Renderizado Final
  container.replaceChildren(node);
  
  // Ejecutar scroll después de que el DOM se actualice
  setTimeout(scrollToPedidoActivo, 100);
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
    const statusInfo = getStatusDetails(pedido.status, pedido.payment_method);

    node.querySelector(".pedido-mini-numero").textContent = `N.º ${String(pedido.order_number).padStart(3, "0")}`;
    node.querySelector(".pedido-mini-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;
    node.querySelector(".pedido-mini-status").textContent = statusInfo.label;

    const img = node.querySelector(".pedido-mini-img");
    if (pedido.payment_method?.includes("cash")) {
      img.src = "imagenes/pago_en_mano.svg";
    } else {
      const { data: rec } = await sb().from("payment_receipts").select("file_url").eq("order_id", pedido.id).maybeSingle();
      img.src = rec?.file_url || "imagenes/recibo_default.svg";
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
