/* ============================================================
   Mis pedidos — Café Cortero 2025
   CLIENTE + ADMIN (MISMO HTML)
============================================================ */

console.log("📦 mis-pedidos.js — ORQUESTADOR CLIENTE / ADMIN");

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

  // 🛠️ ADMIN → cortar flujo cliente
  if (isAdmin) {
    const admin = await import("../admin/admin_pedidos.js");
    admin.init();
    return; // ⛔ MUY IMPORTANTE
  }

  // 👤 CLIENTE
  await loadPedidosCliente();
  renderCliente();
}

/* -----------------------------------------------------------
   DETECTAR MODO (CLIENTE / ADMIN)
----------------------------------------------------------- */
async function detectMode() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const params = new URLSearchParams(location.search);
  const adminParam = params.get("mode") === "admin";

  if (!adminParam) {
    isAdmin = false;
    return;
  }

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    isAdmin = false;
    return;
  }

  const userId = sessionData.session.user.id;

  // 🔑 EL ROL VIVE EN TU TABLA users
  const { data: user } = await sb
    .from("users")
    .select("rol")
    .eq("id", userId)
    .single();

  isAdmin = user?.rol === "admin";

  console.log(isAdmin ? "🛠️ MODO ADMIN" : "👤 MODO CLIENTE");
}

/* -----------------------------------------------------------
   CARGAR PEDIDOS (CLIENTE)
----------------------------------------------------------- */
async function loadPedidosCliente() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    mostrarVacio();
    return;
  }

  const userId = sessionData.session.user.id;

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    mostrarVacio();
    return;
  }

  allPedidos = data;
  currentPage = 1;
}

/* -----------------------------------------------------------
   RENDER CLIENTE
----------------------------------------------------------- */
function renderCliente() {
  renderPedidosCliente();
  renderPaginationCliente();
}

/* -----------------------------------------------------------
   RENDER PEDIDOS CLIENTE
----------------------------------------------------------- */
async function renderPedidosCliente() {
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

    fechas[0].textContent = fecha.toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    fechas[1].textContent = fecha.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit"
    });

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

    clone.querySelector(".estado-icon").textContent =
      statusIconMap[pedido.status] || statusIconMap.default;

    /* Ver recibo */
    clone.querySelector(".ver-recibo").onclick = () => {
      location.href = `recibo.html?id=${pedido.id}`;
    };

    lista.appendChild(clone);
  }
}

/* -----------------------------------------------------------
   PAGINACIÓN CLIENTE
----------------------------------------------------------- */
function renderPaginationCliente() {
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

  container.querySelector("#prev").onclick = () => {
    currentPage--;
    renderCliente();
  };

  container.querySelector("#next").onclick = () => {
    currentPage++;
    renderCliente();
  };
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
