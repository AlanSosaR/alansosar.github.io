/* ============================================================
   ADMIN — Pedidos | Café Cortero
   SOLO ADMIN (filtros + buscador + acciones)
============================================================ */

console.log("🛠️ admin/pedidos.js — PANEL ADMIN");

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* -----------------------------------------------------------
   CONFIG
----------------------------------------------------------- */
const PER_PAGE = 3;

let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
let currentStatus = "new";
let searchTerm = "";

/* -----------------------------------------------------------
   STATUS MAP
----------------------------------------------------------- */
const STATUS_GROUPS = {
  new: ["payment_review", "payment_confirmed", "cash_on_delivery"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  all: []
};

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
export async function init() {
  renderAdminToolbar();
  await loadOrders();
  applyFilters();
  render();
}

/* -----------------------------------------------------------
   LOAD ORDERS (ADMIN)
----------------------------------------------------------- */
async function loadOrders() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data, error } = await sb
    .from("orders")
    .select(`
      *,
      users ( name, email, phone )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos admin:", error);
    return;
  }

  allOrders = data || [];
}

/* -----------------------------------------------------------
   FILTERS
----------------------------------------------------------- */
function applyFilters() {
  filteredOrders = allOrders.filter(order => {
    /* ---- Status ---- */
    if (currentStatus !== "all") {
      const allowed = STATUS_GROUPS[currentStatus] || [];
      if (!allowed.includes(order.status)) return false;
    }

    /* ---- Search ---- */
    if (searchTerm) {
      const q = searchTerm.toLowerCase();

      const match =
        String(order.order_number).includes(q) ||
        order.users?.name?.toLowerCase().includes(q) ||
        order.users?.email?.toLowerCase().includes(q) ||
        order.users?.phone?.includes(q);

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
async function renderOrders() {
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

    /* ---- Número ---- */
    clone.querySelector(".pedido-numero").textContent =
      `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

    /* ---- Fecha / hora ---- */
    const fecha = new Date(pedido.created_at);

    clone.querySelectorAll(".pedido-fecha-valor")[0].textContent =
      fecha.toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

    clone.querySelectorAll(".pedido-fecha-valor")[1].textContent =
      fecha.toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit"
      });

    /* ---- Total ---- */
    clone.querySelector(".pedido-total-valor").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;

    /* ---- Cliente ---- */
    const itemsEl = clone.querySelector(".pedido-items");
    itemsEl.innerHTML = `
      <span class="pedido-label">${pedido.users?.name || "Cliente"}</span>
      <span class="pedido-count">${pedido.users?.phone || ""}</span>
    `;

    /* ---- Estado ---- */
    clone.querySelector(".estado-text").textContent = pedido.status;

    /* ---- Acciones ADMIN ---- */
    const footer = clone.querySelector(".pedido-footer");
    footer.innerHTML = "";

    if (pedido.status === "processing") {
      footer.appendChild(createActionButton("Marcar enviado", async () => {
        await updateStatus(pedido.id, "shipped");
      }));
    }

    if (pedido.status === "shipped") {
      footer.appendChild(createActionButton("Marcar entregado", async () => {
        await updateStatus(pedido.id, "delivered");
      }));
    }

    lista.appendChild(clone);
  }
}

/* -----------------------------------------------------------
   UPDATE STATUS
----------------------------------------------------------- */
async function updateStatus(orderId, status) {
  const sb = getSupabaseClient();
  if (!sb) return;

  const { error } = await sb
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    alert("Error actualizando pedido");
    console.error(error);
    return;
  }

  await loadOrders();
  applyFilters();
  render();
}

/* -----------------------------------------------------------
   UI COMPONENTS
----------------------------------------------------------- */
function renderAdminToolbar() {
  const toolbar = document.getElementById("admin-toolbar");
  if (!toolbar) return;

  toolbar.innerHTML = `
    <div class="admin-toolbar">
      <select id="status-filter">
        <option value="new">Nuevos</option>
        <option value="processing">En proceso</option>
        <option value="shipped">Enviados</option>
        <option value="delivered">Entregados</option>
        <option value="all">Todos</option>
      </select>

      <input
        type="search"
        id="order-search"
        placeholder="Buscar pedido o cliente"
      />
    </div>
  `;

  toolbar.querySelector("#status-filter")
    .addEventListener("change", e => {
      currentStatus = e.target.value;
      applyFilters();
      render();
    });

  toolbar.querySelector("#order-search")
    .addEventListener("input", e => {
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

/* -----------------------------------------------------------
   BUTTON FACTORY
----------------------------------------------------------- */
function createActionButton(text, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn-principal";
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}
