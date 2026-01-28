/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO (FINAL DEFINITIVO)
============================================================ */

console.log("🛠️ admin-pedidos.js — INIT");

/* -----------------------------------------------------------
   SUPABASE
----------------------------------------------------------- */
const sb = window.supabaseClient;
if (!sb) throw new Error("❌ Supabase no inicializado");

/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
let orders = [];
let filtered = [];
let selectedOrder = null;

let currentStatus = "all";
let search = "";

/* -----------------------------------------------------------
   STATUS MAP (REAL DB)
----------------------------------------------------------- */
const STATUS_GROUPS = {
  new: ["pending"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  all: []
};

const STATUS_LABELS = {
  pending: "Nuevo",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado"
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

  console.log("📦 Pedidos cargados:", orders.length);

  applyFilters();
  renderCarousel();

  filtered.length ? selectOrder(filtered[0].id) : showEmpty();
}

/* -----------------------------------------------------------
   LOAD ORDERS (JOINS CORRECTOS)
----------------------------------------------------------- */
async function loadOrders() {
  const { data, error } = await sb
    .from("orders")
    .select(`
      id,
      order_number,
      total,
      status,
      payment_method,
      created_at,
      users (
        name,
        email,
        phone
      ),
      addresses (
        full_name,
        phone,
        country,
        state,
        city,
        street,
        postal_code
      ),
      payment_receipts (
        file_url,
        review_status
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    orders = [];
    return;
  }

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

    if (!search) return true;

    const q = search.toLowerCase();
    const u = o.users?.[0] || {};

    return (
      String(o.order_number).includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });
}

/* -----------------------------------------------------------
   RENDER — CAROUSEL
----------------------------------------------------------- */
function renderCarousel() {
  const wrap = document.getElementById("orders-carousel");
  const tpl = document.getElementById("tpl-order-card");
  const related = document.querySelector(".admin-related");

  wrap.innerHTML = "";

  if (!filtered.length) {
    related.classList.add("hidden");
    return;
  }

  related.classList.remove("hidden");

  for (const o of filtered) {
    const c = tpl.content.cloneNode(true);
    const card = c.querySelector(".order-card");

    card.dataset.id = o.id;

    c.querySelector(".o-card-number").textContent =
      `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;

    c.querySelector(".o-card-total").textContent =
      `L ${Number(o.total).toFixed(2)}`;

    c.querySelector(".o-card-status").textContent =
      STATUS_LABELS[o.status] || o.status;

    card.onclick = () => selectOrder(o.id);

    wrap.appendChild(c);
  }
}

/* -----------------------------------------------------------
   SELECT ORDER → PREVIEW
----------------------------------------------------------- */
function selectOrder(orderId) {
  selectedOrder = orders.find(o => o.id === orderId);
  if (!selectedOrder) return;

  renderPreview(selectedOrder);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -----------------------------------------------------------
   RENDER PREVIEW (FIX CLAVE)
----------------------------------------------------------- */
function renderPreview(o) {
  const preview = document.getElementById("admin-order-preview");
  const empty = document.getElementById("admin-empty-state");

  empty.classList.add("hidden");
  preview.classList.remove("hidden");

  const u = o.users?.[0] || {};
  const a = o.addresses?.[0] || {};
  const receipt = o.payment_receipts?.[0];

  /* HEADER */
  document.getElementById("o-number").textContent =
    `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;

  document.getElementById("o-date").textContent =
    new Date(o.created_at).toLocaleString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  document.getElementById("o-total").textContent =
    `L ${Number(o.total).toFixed(2)}`;

  /* CLIENTE */
  document.getElementById("o-client-name").textContent =
    u.name || a.full_name || "Cliente";

  document.getElementById("o-email").textContent =
    u.email || "—";

  document.getElementById("o-phone").textContent =
    u.phone || a.phone || "—";

  /* DIRECCIÓN */
  document.getElementById("o-address").textContent =
    [a.street, a.city, a.state, a.country]
      .filter(Boolean)
      .join(", ") || "—";

  document.getElementById("o-reference").textContent =
    a.postal_code || "—";

  /* PAGO */
  const cash = document.getElementById("cash-payment");
  const receiptBox = document.getElementById("receipt-payment");

  cash.classList.add("hidden");
  receiptBox.classList.add("hidden");

  if (o.payment_method === "cash_on_delivery") {
    cash.classList.remove("hidden");
  }

  if (receipt?.file_url) {
    receiptBox.classList.remove("hidden");
    document.getElementById("receipt-img").src = receipt.file_url;
  }

  /* ACCIONES */
  document.getElementById("btnShip").onclick =
    () => updateStatus(o.id, "shipped");

  document.getElementById("btnDeliver").onclick =
    () => updateStatus(o.id, "delivered");
}

/* -----------------------------------------------------------
   UPDATE STATUS
----------------------------------------------------------- */
async function updateStatus(orderId, status) {
  const { error } = await sb
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    console.error("❌ Error actualizando estado:", error);
    return;
  }

  await loadOrders();
  applyFilters();
  renderCarousel();

  filtered.length ? selectOrder(filtered[0].id) : showEmpty();
}

/* -----------------------------------------------------------
   CONTROLS
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter").onchange = e => {
    currentStatus = e.target.value;
    applyFilters();
    renderCarousel();
    filtered.length ? selectOrder(filtered[0].id) : showEmpty();
  };

  document.getElementById("search-orders").oninput = e => {
    search = e.target.value.trim();
    applyFilters();
    renderCarousel();
    filtered.length ? selectOrder(filtered[0].id) : showEmpty();
  };

  document.getElementById("btnBackOrders").onclick = () => {
    document.getElementById("admin-order-preview").classList.add("hidden");
  };
}

/* -----------------------------------------------------------
   EMPTY STATE
----------------------------------------------------------- */
function showEmpty() {
  document.getElementById("admin-order-preview").classList.add("hidden");
  document.getElementById("admin-empty-state").classList.remove("hidden");
}
