/* ============================================================
   Mis pedidos — Café Cortero 2025
   CLIENTE + ADMIN (MISMO HTML)
============================================================ */

console.log("📦 mis-pedidos.js — CLIENTE + ADMIN + PAGINACIÓN");

/* -----------------------------------------------------------
   CONFIG
----------------------------------------------------------- */
const PER_PAGE = 3;
let currentPage = 1;
let allPedidos = [];
let isAdmin = false;

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* -----------------------------------------------------------
   MAPEO DE STATUS → ETAPAS VISUALES
----------------------------------------------------------- */
function mapStatusToProgress(status) {
  switch (status) {
    case "payment_review":
      return 1;
    case "payment_confirmed":
    case "cash_on_delivery":
    case "processing":
      return 2;
    case "shipped":
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

function formatStatusLabel(status) {
  const map = {
    payment_review: "Pago en revisión",
    payment_confirmed: "Pago confirmado",
    cash_on_delivery: "Pago contra entrega",
    processing: "En ejecución",
    shipped: "Enviado",
    delivered: "Entregado"
  };
  return map[status] || "Pendiente de pago";
}

/* -----------------------------------------------------------
   ICONOS MATERIAL 3
----------------------------------------------------------- */
const statusIconMap = {
  payment_review: "fact_check",
  payment_confirmed: "verified",
  cash_on_delivery: "payments",
  processing: "autorenew",
  shipped: "local_shipping",
  delivered: "done_all",
  default: "payments"
};

/* -----------------------------------------------------------
   PROGRESO VISUAL
----------------------------------------------------------- */
function applyProgressColors(container, etapa) {
  const steps = container.querySelectorAll(".step");
  const lines = container.querySelectorAll(".line");
  const clases = ["pago", "revision", "confirmado", "envio"];

  steps.forEach((step, i) => {
    step.classList.remove(...clases);
    if (i <= etapa) step.classList.add(clases[i]);
  });

  lines.forEach((line, i) => {
    line.classList.remove(...clases);
    if (i < etapa) line.classList.add(clases[i]);
  });
}

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("header:ready", init);
init();

async function init() {
  await detectMode();
  await loadPedidos();
  render();
}

/* -----------------------------------------------------------
   DETECTAR MODO (CLIENTE / ADMIN)
----------------------------------------------------------- */
async function detectMode() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const params = new URLSearchParams(location.search);
  const adminParam = params.get("mode") === "admin";

  const { data: sessionData } = await sb.auth.getSession();
  const role = sessionData?.session?.user?.rol;

  isAdmin = adminParam || role === "admin";

  console.log(isAdmin ? "🛠️ MODO ADMIN" : "👤 MODO CLIENTE");
}

/* -----------------------------------------------------------
   CARGAR PEDIDOS
----------------------------------------------------------- */
async function loadPedidos() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    mostrarVacio();
    return;
  }

  let query = sb
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  // 👤 Cliente → solo sus pedidos
  if (!isAdmin) {
    query = query.eq("user_id", sessionData.session.user.id);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    mostrarVacio();
    return;
  }

  allPedidos = data;
  currentPage = 1;
}

/* -----------------------------------------------------------
   RENDER GENERAL
----------------------------------------------------------- */
function render() {
  renderPedidos();
  renderPagination();
}

/* -----------------------------------------------------------
   RENDER PEDIDOS (PAGINADOS)
----------------------------------------------------------- */
async function renderPedidos() {
  const lista      = document.getElementById("pedidos-lista");
  const emptyState = document.getElementById("empty-state");
  const seguirBack = document.querySelector(".seguir-comprando");
  const template   = document.getElementById("pedido-template");

  if (!lista || !template) return;

  lista.innerHTML = "";

  if (allPedidos.length === 0) {
    mostrarVacio();
    return;
  }

  emptyState.classList.add("hidden");
  if (seguirBack) seguirBack.style.display = "flex";

  const start = (currentPage - 1) * PER_PAGE;
  const end   = start + PER_PAGE;
  const pagePedidos = allPedidos.slice(start, end);

  const sb = getSupabaseClient();

  for (const pedido of pagePedidos) {
    const clone = template.content.cloneNode(true);

    /* Número */
    clone.querySelector(".pedido-numero").textContent =
      `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

    /* Fecha / Hora */
    const fecha = new Date(pedido.created_at);
    const fechas = clone.querySelectorAll(".pedido-fecha-valor");

    if (fechas.length >= 2) {
      fechas[0].textContent = fecha.toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
      fechas[1].textContent = fecha.toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    /* Total cafés */
    const { data: items } = await sb
      .from("order_items")
      .select("quantity")
      .eq("order_id", pedido.id);

    const totalCafes =
      items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

    clone.querySelector(".pedido-count").textContent =
      `(${totalCafes} café${totalCafes !== 1 ? "s" : ""})`;

    /* Total */
    clone.querySelector(".pedido-total-valor").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;

    /* Estado */
    clone.querySelector(".estado-text").textContent =
      formatStatusLabel(pedido.status);

    const etapa = mapStatusToProgress(pedido.status);
    applyProgressColors(clone, etapa);

    const estadoEl = clone.querySelector(".estado");
    const iconEl   = clone.querySelector(".estado-icon");

    estadoEl.classList.remove("pago", "revision", "confirmado", "envio");
    const clases = ["pago", "revision", "confirmado", "envio"];
    if (clases[etapa]) estadoEl.classList.add(clases[etapa]);

    iconEl.textContent =
      statusIconMap[pedido.status] || statusIconMap.default;

    /* Ver recibo */
    clone.querySelector(".ver-recibo")
      .addEventListener("click", () => {
        location.href = `recibo.html?id=${pedido.id}`;
      });

    lista.appendChild(clone);
  }
}

/* -----------------------------------------------------------
   PAGINACIÓN
----------------------------------------------------------- */
function renderPagination() {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  const totalPages = Math.ceil(allPedidos.length / PER_PAGE);

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="pagination">
      <button ${currentPage === 1 ? "disabled" : ""} id="prev">◀</button>
      <span>${currentPage} / ${totalPages}</span>
      <button ${currentPage === totalPages ? "disabled" : ""} id="next">▶</button>
    </div>
  `;

  container.querySelector("#prev")?.addEventListener("click", () => {
    currentPage--;
    render();
  });

  container.querySelector("#next")?.addEventListener("click", () => {
    currentPage++;
    render();
  });
}

/* -----------------------------------------------------------
   EMPTY STATE
----------------------------------------------------------- */
function mostrarVacio() {
  const lista      = document.getElementById("pedidos-lista");
  const emptyState = document.getElementById("empty-state");
  const seguirBack = document.querySelector(".seguir-comprando");

  if (lista) lista.innerHTML = "";
  emptyState?.classList.remove("hidden");
  if (seguirBack) seguirBack.style.display = "none";
}
