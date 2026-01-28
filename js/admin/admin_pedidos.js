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
   INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  waitForSupabase(init);
});

function waitForSupabase(cb, retries = 20) {
  if (getSupabaseClient()) return cb();
  if (retries <= 0) return console.error("❌ Supabase no disponible");
  setTimeout(() => waitForSupabase(cb, retries - 1), 200);
}

async function init() {
  const user = getUserCache();
  if (!user || user.rol !== "admin") return;

  bindControls();
  await loadOrders();
  applyFilters();
  render();
}

/* -----------------------------------------------------------
   LOAD ORDERS
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

  console.log("📦 PEDIDOS ADMIN:", data);
  allOrders = data || [];
}

/* -----------------------------------------------------------
   FILTERS
----------------------------------------------------------- */
function applyFilters() {
  filteredOrders = allOrders.filter(o => {
    if (currentStatus !== "all") {
      if (!STATUS_GROUPS[currentStatus]?.includes(o.status)) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const u = o.users || {};
      if (
        !String(o.order_number).includes(q) &&
        !u.name?.toLowerCase().includes(q) &&
        !u.email?.toLowerCase().includes(q) &&
        !u.phone?.includes(q)
      ) return false;
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
  return {
    items: filteredOrders.slice(start, start + PER_PAGE),
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
   RENDER ORDERS — ADMIN CARD
----------------------------------------------------------- */
function renderOrders() {
  const list = document.getElementById("pedidos-lista");
  const tpl = document.getElementById("pedido-template");
  const empty = document.getElementById("empty-state");

  list.innerHTML = "";

  if (!filteredOrders.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  const { items } = paginate();

  for (const o of items) {
    const c = tpl.content.cloneNode(true);
    const u = o.users || {};

    // Header
    c.querySelector(".pedido-numero").textContent =
      `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;

    c.querySelector(".order-date").textContent =
      new Date(o.created_at).toLocaleString("es-HN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

    // Cliente
    c.querySelector(".client-name").textContent = u.name || "Cliente";
    c.querySelector(".client-meta").innerHTML = `
      <span><i class="fa-solid fa-envelope"></i> ${u.email || "-"}</span>
      <span><i class="fa-solid fa-phone"></i> ${u.phone || "-"}</span>
    `;

    // Estado
    c.querySelector(".status-text").textContent = o.status;

    // Resumen
    c.querySelector(".order-summary").innerHTML = `
      <span>—</span>
      <strong>Total: L ${Number(o.total).toFixed(2)}</strong>
    `;

    list.appendChild(c);
  }
}

/* -----------------------------------------------------------
   CONTROLES
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter")?.addEventListener("change", e => {
    currentStatus = e.target.value;
    applyFilters();
    render();
  });

  document.getElementById("admin-orders-search")?.addEventListener("input", e => {
    searchTerm = e.target.value.trim();
    applyFilters();
    render();
  });
}

/* -----------------------------------------------------------
   PAGINATION UI
----------------------------------------------------------- */
function renderPagination() {
  const el = document.getElementById("pagination-container");
  const { totalPages } = paginate();

  if (totalPages <= 1) return (el.innerHTML = "");

  el.innerHTML = `
    <div class="pagination">
      <button ${currentPage === 1 ? "disabled" : ""} id="prev">◀</button>
      <span>${currentPage} / ${totalPages}</span>
      <button ${currentPage === totalPages ? "disabled" : ""} id="next">▶</button>
    </div>
  `;

  el.querySelector("#prev").onclick = () => { currentPage--; render(); };
  el.querySelector("#next").onclick = () => { currentPage++; render(); };
}
