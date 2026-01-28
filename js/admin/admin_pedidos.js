/* ============================================================
   ADMIN — Pedidos | Café Cortero
   SOLO ADMIN
============================================================ */

console.log("🛠️ admin_pedidos.js — PANEL ADMIN");

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

function getUserCache() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

/* -----------------------------------------------------------
   CONFIG
----------------------------------------------------------- */
const PER_PAGE = 5;

let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
let currentStatus = "all";
let searchTerm = "";

/* -----------------------------------------------------------
   STATUS GROUPS (UNIFICADOS)
----------------------------------------------------------- */
const STATUS_GROUPS = {
  new: ["payment_review", "cash_on_delivery"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  all: []
};

/* -----------------------------------------------------------
   INIT (AUTO)
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const user = getUserCache();
  if (!user || user.rol !== "admin") {
    console.warn("⛔ Acceso denegado (no admin)");
    return;
  }

  renderAdminToolbar();
  await loadOrders();
  applyFilters();
  render();
}

/* -----------------------------------------------------------
   LOAD ORDERS (ADMIN VE TODOS)
----------------------------------------------------------- */
async function loadOrders() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data, error } = await sb
    .from("orders")
    .select(`
      id,
      order_number,
      total,
      status,
      created_at,
      users (
        name,
        email,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    return;
  }

  allOrders = data || [];
}

/* -----------------------------------------------------------
   FILTERS
----------------------------------------------------------- */
function applyFilters() {
  filteredOrders = allOrders.filter(order => {
    // STATUS
    if (currentStatus !== "all") {
      const allowed = STATUS_GROUPS[currentStatus] || [];
      if (!allowed.includes(order.status)) return false;
    }

    // SEARCH
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const user = order.users || {};

      const match =
        String(order.order_number).includes(q) ||
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.phone?.includes(q);

      if (!match) return false;
    }

    return true;
  });

  currentPage = 1;
}

/* -----------------------------------------------------------
   PAGINATION
----------------------------------------------------------- */
function paginate() {
  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;

  return {
    items: filteredOrders.slice(start, end),
    totalPages: Math.ceil(filteredOrders.length / PER_PAGE)
  };
}

/* -----------------------------------------------------------
   RENDER
----------------------------------------------------------- */
function render() {
  renderOrders();
  renderPagination();
}

/* -----------------------------------------------------------
   RENDER ORDERS
----------------------------------------------------------- */
function renderOrders() {
  const lista = document.getElementById("pedidos-lista");
  const template = document.getElementById("pedido-template");
  const emptyState = document.getElementById("empty-state");

  if (!lista || !template) return;

  lista.innerHTML = "";

  if (filteredOrders.length === 0) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  const { items } = paginate();

  for (const pedido of items) {
    const clone = template.content.cloneNode(true);
    const user = pedido.users || {};

    clone.querySelector(".pedido-numero").textContent =
      `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

    const fecha = new Date(pedido.created_at);
    const fechas = clone.querySelectorAll(".pedido-fecha-valor");

    fechas[0].textContent = fecha.toLocaleDateString("es-HN");
    fechas[1].textContent = fecha.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit"
    });

    clone.querySelector(".pedido-total-valor").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;

    clone.querySelector(".pedido-items").innerHTML = `
      <span class="pedido-label">${user.name || "Cliente"}</span>
      <span class="pedido-count">${user.phone || ""}</span>
    `;

    clone.querySelector(".estado-text").textContent = pedido.status;

    lista.appendChild(clone);
  }
}

/* -----------------------------------------------------------
   TOOLBAR
----------------------------------------------------------- */
function renderAdminToolbar() {
  const toolbar = document.getElementById("admin-toolbar");
  if (!toolbar) return;

  toolbar.innerHTML = `
    <div class="admin-toolbar">
      <select id="status-filter">
        <option value="all">Todos</option>
        <option value="new">Nuevos</option>
        <option value="processing">En proceso</option>
        <option value="shipped">Enviados</option>
        <option value="delivered">Entregados</option>
      </select>

      <input id="order-search" type="search" placeholder="Buscar pedido o cliente" />
    </div>
  `;

  toolbar.querySelector("#status-filter").addEventListener("change", e => {
    currentStatus = e.target.value;
    applyFilters();
    render();
  });

  toolbar.querySelector("#order-search").addEventListener("input", e => {
    searchTerm = e.target.value.trim();
    applyFilters();
    render();
  });
}

/* -----------------------------------------------------------
   PAGINATION UI
----------------------------------------------------------- */
function renderPagination() {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  const { totalPages } = paginate();

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
