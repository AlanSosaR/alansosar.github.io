/* ============================================================
   MIS PEDIDOS — CLIENTE (FINAL ESTABLE + ESTADOS DINÁMICOS)
============================================================ */

console.log("📦 mis-pedidos.js — ACTUALIZADO CON LÓGICA DE PAGO");

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
   LÓGICA DE ESTADOS DINÁMICOS
----------------------------------------------------------- */
function getStatusDetails(status, paymentMethod) {
  const isCash = paymentMethod?.includes("cash");

  // Diccionario de estados según el método de pago
  const maps = {
    // FLUJO CON RECIBO (TRANSFERENCIA)
    transfer: {
      pending: { step: 1, label: "Pago enviado", desc: "Recibo recibido. Estamos validando la transacción con el banco." },
      payment_review: { step: 2, label: "En revisión", desc: "Un administrador está verificando que los datos coincidan." },
      processing: { step: 3, label: "Confirmado", desc: "¡Todo listo! Tu pago ha sido aprobado y el pedido confirmado." },
      shipped: { step: 4, label: "Enviado", desc: "Tu paquete está en camino a la dirección registrada." },
      delivered: { step: 4, label: "Entregado", desc: "El pedido ha sido entregado satisfactoriamente." }
    },
    // FLUJO PAGO AL RECIBIR (CASH)
    cash: {
      pending: { step: 1, label: "Pedido registrado", desc: "Solicitud de 'Pago al recibir' recibida correctamente." },
      payment_review: { step: 2, label: "Preparación", desc: "Estamos armando tu paquete y coordinando la entrega." },
      processing: { step: 3, label: "En camino", desc: "El repartidor lleva tu pedido. Ten el efectivo listo." },
      shipped: { step: 3, label: "En camino", desc: "El repartidor lleva tu pedido. Ten el efectivo listo." },
      delivered: { step: 4, label: "Entregado y Pagado", desc: "Transacción completada con éxito en la entrega." }
    }
  };

  const currentMap = isCash ? maps.cash : maps.transfer;
  return currentMap[status] || currentMap.pending;
}

/* -----------------------------------------------------------
   SCROLL SUAVE
----------------------------------------------------------- */
function scrollToPedidoActivo() {
  const section = document.getElementById("pedido-activo");
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY - 12;
  window.scrollTo({ top, behavior: "smooth" });
}

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
   RENDER PEDIDO ACTIVO
----------------------------------------------------------- */
async function renderPedidoActivo(pedido) {
  const container = document.getElementById("pedido-activo");
  const tpl = document.getElementById("pedido-activo-template");
  if (!container || !tpl) return;

  container.style.opacity = "0.85";
  const node = tpl.content.cloneNode(true);

  /* Header e Info Básica */
  node.querySelector(".pedido-numero").textContent = `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;
  const { fecha, hora } = formatDateTime(pedido.created_at);
  node.querySelector(".fecha").textContent = fecha;
  node.querySelector(".hora").textContent = hora;
  node.querySelector(".pedido-total").textContent = `L ${Number(pedido.total).toFixed(2)}`;

  /* Dirección */
  if (pedido.address_id) {
    const { data: addr } = await sb().from("addresses").select("*").eq("id", pedido.address_id).maybeSingle();
    if (addr) {
      node.querySelector(".entrega-text").textContent = `${addr.street}, ${addr.city}`;
      node.querySelector(".referencia-text").textContent = addr.postal_code || "Sin referencia";
    }
  }

  /* Productos */
  const pills = node.querySelector(".productos-pills");
  const { data: items } = await sb().from("order_items").select("*").eq("order_id", pedido.id);
  if (items?.length) {
    const ids = [...new Set(items.map(i => i.product_id))];
    const { data: prods } = await sb().from("products").select("id, name").in("id", ids);
    const map = {};
    prods?.forEach(p => (map[p.id] = p.name));
    items.forEach(i => {
      const div = document.createElement("div");
      div.className = "pill";
      div.innerHTML = `<span>${map[i.product_id] || "Producto"} × ${i.quantity}</span><strong>L ${(i.quantity * i.price).toFixed(2)}</strong>`;
      pills.appendChild(div);
    });
  }

  /* --- ESTADO DINÁMICO --- */
  const statusInfo = getStatusDetails(pedido.status, pedido.payment_method);
  
  node.querySelector(".estado-paso").textContent = statusInfo.step;
  node.querySelector(".estado-nombre").textContent = statusInfo.label;
  
  // Si tienes un elemento para la descripción en tu HTML, lo llenamos:
  const descEl = node.querySelector(".estado-descripcion");
  if (descEl) descEl.textContent = statusInfo.desc;

  node.querySelectorAll(".estado-item").forEach((li, i) => {
    const stepIdx = i + 1;
    li.classList.remove("completado", "activo");
    if (stepIdx < statusInfo.step) li.classList.add("completado");
    if (stepIdx === statusInfo.step) li.classList.add("activo");
    
    // Opcional: Cambiar nombres de los pasos de la lista según el tipo de pago
    const stepLabel = li.querySelector(".step-label"); // Si tienes esta clase en tu HTML
    if (stepLabel) {
       // Aquí podrías personalizar los 4 nombres de la lista si quisieras
    }
  });

  /* Imagen + botón recibo */
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

/* -----------------------------------------------------------
   FLECHAS Y EMPTY STATE
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
    next.style.display = list.scrollLeft + list.clientWidth < list.scrollWidth - 10 ? "flex" : "none";
  };
  list.addEventListener("scroll", toggle);
  setTimeout(toggle, 300);
}

function mostrarVacio() {
  document.getElementById("pedido-activo")?.classList.add("hidden");
  document.getElementById("mis-pedidos-carrusel")?.classList.add("hidden");
  document.getElementById("empty-state")?.classList.remove("hidden");
}
