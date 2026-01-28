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
   STATUS GROUPS
----------------------------------------------------------- */
const STATUS_GROUPS = {
  new: ["payment_review", "cash_on_delivery"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  all: []
};

/* -----------------------------------------------------------
   INIT (ESPERA SUPABASE)
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  waitForSupabase(init);
});

function waitForSupabase(cb, retries = 20) {
  if (getSupabaseClient()) return cb();
  if (retries <= 0) {
    console.error("❌ Supabase no disponible");
    return;
  }
  setTimeout(() => waitForSupabase(cb, retries - 1), 200);
}

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
   LOAD ORDERS — ADMIN (JOIN CORRECTO)
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
      users:users!orders_user_id_fkey (
        name,
        email,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos admin:", error);
    return;
  }

  console.log("📦 PEDIDOS ADMIN:", data);

  allOrders = data || [];
}

/* -----------------------------------------------------------
   FILTERS
----------------------------------------------------------- */
function applyFilters() {
  filteredOrders = allOrders.filter(order => {
    if (currentStatus !== "all") {
      const allowed = STATUS_GROUPS[currentStatus] || [];
      if (!allowed.includes(order.status)) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const u = order.users || {};

      const match =
        String(order.order_number).includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q);

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

  if (!filteredOrders.length) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  const { items } = paginate();

  for (const pedido of items) {
    const clone = template.content.cloneNode(true);
    const u = pedido.users || {};

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
      <span class="pedido-label">${u.name || "Cliente"}</span>
      <span class="pedido-count">${u.phone || ""}</span>
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

      <input
        id="order-search"
        type="search"
        placeholder="Buscar pedido, cliente o teléfono"
      />
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
