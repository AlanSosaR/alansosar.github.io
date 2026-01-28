/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO
============================================================ */

console.log("🛠️ admin-pedidos.js — INIT");

/* -----------------------------------------------------------
   SUPABASE
----------------------------------------------------------- */
const sb = window.supabaseClient;
if (!sb) {
  console.error("❌ supabaseClient no disponible");
}

/* -----------------------------------------------------------
   CONFIG
----------------------------------------------------------- */
const PER_PAGE = 5;

let orders = [];
let filtered = [];
let page = 1;
let currentStatus = "new";
let search = "";

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
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const user = JSON.parse(localStorage.getItem("cortero_user") || "null");

  if (!user || user.rol !== "admin") {
    console.warn("⛔ Acceso no autorizado");
    return;
  }

  bindControls();
  await loadOrders();
  applyFilters();
  render();
}

/* -----------------------------------------------------------
   LOAD ORDERS (ADMIN)
----------------------------------------------------------- */
async function loadOrders() {
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
  orders = data || [];
}

/* -----------------------------------------------------------
   FILTERS
----------------------------------------------------------- */
function applyFilters() {
  filtered = orders.filter(o => {
    if (
      currentStatus !== "all" &&
      !STATUS_GROUPS[currentStatus].includes(o.status)
    ) return false;

    if (search) {
      const q = search.toLowerCase();
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

  page = 1;
}

/* -----------------------------------------------------------
   RENDER
----------------------------------------------------------- */
function render() {
  renderOrders();
  renderPagination();
}

/* -----------------------------------------------------------
   RENDER ORDERS (TARJETAS ADMIN)
----------------------------------------------------------- */
function renderOrders() {
  const list = document.getElementById("pedidos-lista");
  const tpl = document.getElementById("pedido-template");
  const empty = document.getElementById("empty-state");

  list.innerHTML = "";

  if (!filtered.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  const start = (page - 1) * PER_PAGE;
  const items = filtered.slice(start, start + PER_PAGE);

  for (const o of items) {
    const c = tpl.content.cloneNode(true);
    const u = o.users || {};

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

    c.querySelector(".client-name").textContent = u.name || "Cliente";
    c.querySelector(".client-meta").innerHTML = `
      <span><i class="fa-solid fa-envelope"></i> ${u.email || "-"}</span>
      <span><i class="fa-solid fa-phone"></i> ${u.phone || "-"}</span>
    `;

    c.querySelector(".status-text").textContent = o.status;

    c.querySelector(".order-summary").innerHTML =
      `<strong>Total: L ${Number(o.total).toFixed(2)}</strong>`;

    list.appendChild(c);
  }
}

/* -----------------------------------------------------------
   CONTROLS
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter").onchange = e => {
    currentStatus = e.target.value;
    applyFilters();
    render();
  };

  document.getElementById("admin-orders-search").oninput = e => {
    search = e.target.value.trim();
    applyFilters();
    render();
  };
}

/* -----------------------------------------------------------
   PAGINATION
----------------------------------------------------------- */
function renderPagination() {
  const el = document.getElementById("pagination-container");
  const total = Math.ceil(filtered.length / PER_PAGE);

  if (total <= 1) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="pagination">
      <button ${page === 1 ? "disabled" : ""} id="prev">◀</button>
      <span>${page} / ${total}</span>
      <button ${page === total ? "disabled" : ""} id="next">▶</button>
    </div>
  `;

  el.querySelector("#prev").onclick = () => {
    page--;
    render();
  };

  el.querySelector("#next").onclick = () => {
    page++;
    render();
  };
}
