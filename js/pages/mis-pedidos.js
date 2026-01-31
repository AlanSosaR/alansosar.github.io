/* ============================================================
   📦 mis-pedidos.js — VERSIÓN PRO DINÁMICA
============================================================ */

console.log("🚀 mis-pedidos.js — Cargando Interfaz Pro");

let allPedidos = [];
let pedidoActivo = null;
let __init = false;
let autoRefreshInterval = null;

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
   SCROLL DINÁMICO PRO (Calcula el centro visual)
----------------------------------------------------------- */
function scrollToPedidoActivo() {
  const section = document.getElementById("pedido-activo");
  if (!section) return;

  // Pequeña animación de entrada al contenedor
  section.style.opacity = "0";
  section.style.transform = "translateY(10px)";
  
  const offset = 120;
  const elementPosition = section.getBoundingClientRect().top + window.scrollY;
  
  window.scrollTo({
    top: elementPosition - offset,
    behavior: "smooth"
  });

  // Efecto Fade-in progresivo
  setTimeout(() => {
    section.style.transition = "all 0.5s ease";
    section.style.opacity = "1";
    section.style.transform = "translateY(0)";
  }, 100);
}

/* -----------------------------------------------------------
   LÓGICA DE ESTADOS Y DESCRIPCIONES DINÁMICAS
----------------------------------------------------------- */
function getStatusDetails(status, paymentMethod) {
  const isCash = paymentMethod?.includes("cash");

  const maps = {
    transfer: {
      stepsNames: ["Pago enviado", "En revisión", "Confirmado", "Enviado"],
      pending: { step: 1, label: "Pago enviado", desc: "Hemos recibido tu comprobante. Estamos validando la transacción con nuestro banco." },
      payment_review: { step: 2, label: "En revisión", desc: "Un administrador está verificando que los datos coincidan. Esto suele tardar unos minutos." },
      processing: { step: 3, label: "Pago Confirmado", desc: "¡Todo listo! Tu pago ha sido aprobado y el pedido está confirmado." },
      shipped: { step: 4, label: "Pedido Enviado", desc: "Tu paquete está en camino a la dirección registrada." },
      delivered: { step: 4, label: "Entregado", desc: "El pedido ha sido entregado satisfactoriamente." }
    },
    cash: {
      stepsNames: ["Pedido registrado", "Preparación", "En camino", "Entregado"],
      pending: { step: 1, label: "Pedido registrado", desc: "Tu solicitud de 'Pago al recibir' ha sido recibida correctamente." },
      payment_review: { step: 2, label: "Preparación", desc: "Estamos armando tu paquete y coordinando con el repartidor para la entrega." },
      processing: { step: 3, label: "En camino / Reparto", desc: "El repartidor lleva tu pedido. Por favor, ten el efectivo listo para completar la compra." },
      shipped: { step: 3, label: "En camino / Reparto", desc: "El repartidor lleva tu pedido. Por favor, ten el efectivo listo para completar la compra." },
      delivered: { step: 4, label: "Entregado y Pagado", desc: "La transacción se ha completado con éxito al momento de la entrega." }
    }
  };

  const currentMap = isCash ? maps.cash : maps.transfer;
  const info = currentMap[status] || currentMap.pending;
  return { ...info, stepsNames: currentMap.stepsNames };
}

/* -----------------------------------------------------------
   INIT & LOAD (Con Polling de 30s)
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

  // Iniciar actualización automática cada 30 segundos
  startAutoRefresh();
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
    // Si ya hay un pedido seleccionado, actualizamos su data sin perder la selección
    if (pedidoActivo) {
      pedidoActivo = allPedidos.find(p => p.id === pedidoActivo.id) || allPedidos[0];
    } else {
      pedidoActivo = data[0];
    }
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(async () => {
    console.log("🔄 Sincronizando estados...");
    await loadPedidos();
    // Renderizamos de nuevo el activo para ver cambios de estado sin recargar
    if (pedidoActivo) renderPedidoActivo(pedidoActivo, true);
    renderCarrusel();
  }, 30000); // 30 segundos
}

/* -----------------------------------------------------------
   RENDER PEDIDO ACTIVO
----------------------------------------------------------- */
async function renderPedidoActivo(pedido, isAutoRefresh = false) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  const node = tpl.content.cloneNode(true);
  const statusInfo = getStatusDetails(pedido.status, pedido.payment_method);

  // Header e IDs
  node.querySelector(".pedido-numero").textContent = `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;
  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;

  // Dirección y Referencia (Historical Data)
  if (pedido.address_id) {
    const { data: addr } = await sb().from("addresses").select("street, city").eq("id", pedido.address_id).maybeSingle();
    if (addr) node.querySelector(".entrega-text").textContent = `${addr.street}, ${addr.city}`;
  }
  node.querySelector(".referencia-text").textContent = pedido.order_notes || "Sin referencia adicional";

  // Productos (Pills)
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

  // Estado Dinámico y Descripción
  node.querySelector(".estado-paso").textContent = statusInfo.step;
  node.querySelector(".estado-nombre").textContent = statusInfo.label;
  
  const descEl = node.querySelector(".estado-descripcion");
  if (descEl) descEl.textContent = statusInfo.desc;

  const listaPasos = node.querySelectorAll(".estado-item");
  listaPasos.forEach((li, i) => {
    const textSpan = li.querySelector(".step-text");
    if (textSpan) textSpan.textContent = statusInfo.stepsNames[i];

    const currentIdx = i + 1;
    if (currentIdx < statusInfo.step) li.classList.add("completado");
    if (currentIdx === statusInfo.step) li.classList.add("activo");
  });

  // Media (Recibo o Icono)
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

  container.replaceChildren(node);
  
  // Solo hace scroll si es una interacción del usuario, no si es actualización automática
  if (!isAutoRefresh) scrollToPedidoActivo();
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
      pedidoActivo = pedido;
      renderPedidoActivo(pedido);
      renderCarrusel();
    };
    wrapper.appendChild(node);
  }
}

function bindCarruselArrows() {
  const list = document.getElementById("pedidos-carrusel");
  const prev = document.getElementById("pedidos-prev");
  const next = document.getElementById("pedidos-next");
  if (list && prev && next) {
    prev.onclick = () => list.scrollBy({ left: -300, behavior: "smooth" });
    next.onclick = () => list.scrollBy({ left: 300, behavior: "smooth" });
  }
}

function mostrarVacio() {
  document.getElementById("pedido-activo")?.classList.add("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.add("hidden");
  document.getElementById("empty-state")?.classList.remove("hidden");
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
}
