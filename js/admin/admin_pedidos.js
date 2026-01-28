/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO (CORE FINAL — NUEVOS POR DEFECTO)
============================================================ */

console.log("🛠️ admin-pedidos.js — INIT");

const sb = window.supabaseClient;
if (!sb) throw new Error("❌ Supabase no inicializado");

/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
let orders = [];
let filtered = [];
let selectedOrder = null;

/* 🔑 Estado inicial: SOLO NUEVOS */
let currentStatus = "new";
let search = "";

/* -----------------------------------------------------------
   STATUS MAP
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
  if (!user || user.rol !== "admin") return;

  /* 🔑 sincroniza UI con lógica */
  document.getElementById("status-filter").value = "new";

  bindControls();
  await loadOrders();        // 👈 SOLO NUEVOS
  applyFilters();
  renderCarousel();

  filtered.length ? forceSelectFirst() : showEmpty();
}

/* -----------------------------------------------------------
   LOAD ORDERS — SOLO NUEVOS (BACKEND)
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

      users:users!orders_user_id_fkey (
        name,
        email,
        phone
      ),

      address:addresses!orders_address_id_fkey (
        full_name,
        phone,
        country,
        state,
        city,
        street,
        postal_code
      ),

      receipt:payment_receipts!payment_receipts_order_fk (
        file_url,
        review_status
      )
    `)
    .eq("status", "pending")              // 🔥 CLAVE
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    orders = [];
    return;
  }

  orders = data || [];
  console.log("📦 Pedidos NUEVOS:", orders.length);
}

/* -----------------------------------------------------------
   FILTERS (frontend solo cuando cambia el select)
----------------------------------------------------------- */
function applyFilters() {
  filtered = orders.filter(o => {
    if (
      currentStatus !== "all" &&
      !STATUS_GROUPS[currentStatus].includes(o.status)
    ) return false;

    if (!search) return true;

    const q = search.toLowerCase();
    const u = o.users || {};

    return (
      String(o.order_number).includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });
}

/* -----------------------------------------------------------
   CARRUSEL
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
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".order-card");

    card.dataset.id = o.id;
    node.querySelector(".o-card-number").textContent =
      `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;
    node.querySelector(".o-card-total").textContent =
      `L ${Number(o.total).toFixed(2)}`;
    node.querySelector(".o-card-status").textContent =
      STATUS_LABELS[o.status] || o.status;

    card.addEventListener("click", () => selectOrder(o.id));
    wrap.appendChild(node);
  }
}

/* -----------------------------------------------------------
   SELECCIÓN INICIAL
----------------------------------------------------------- */
function forceSelectFirst() {
  requestAnimationFrame(() => selectOrder(filtered[0].id));
}

/* -----------------------------------------------------------
   SELECT ORDER
----------------------------------------------------------- */
function selectOrder(orderId) {
  selectedOrder = orders.find(o => o.id === orderId);
  if (!selectedOrder) return;

  document.getElementById("admin-empty-state").classList.add("hidden");

  const related = document.querySelector(".admin-related");
  related.classList.add("hidden");
  related.style.display = "none";

  const preview = document.getElementById("admin-order-preview");
  preview.classList.remove("hidden");

  renderPreview(selectedOrder);
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* -----------------------------------------------------------
   PREVIEW
----------------------------------------------------------- */
function renderPreview(o) {
  const u = o.users || {};
  const a = o.address || {};
  const r = o.receipt?.[0];

  document.getElementById("o-number").textContent =
    `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;
  document.getElementById("o-date").textContent =
    new Date(o.created_at).toLocaleString("es-HN");
  document.getElementById("o-total").textContent =
    `L ${Number(o.total).toFixed(2)}`;

  document.getElementById("o-client-name").textContent =
    u.name || a.full_name || "Cliente";
  document.getElementById("o-email").textContent = u.email || "—";
  document.getElementById("o-phone").textContent = u.phone || a.phone || "—";
  document.getElementById("o-address").textContent =
    [a.street, a.city, a.state, a.country].filter(Boolean).join(", ") || "—";
  document.getElementById("o-reference").textContent =
    a.postal_code || "—";

  const cash = document.getElementById("cash-payment");
  const receiptBox = document.getElementById("receipt-payment");
  cash.classList.add("hidden");
  receiptBox.classList.add("hidden");

  if (o.payment_method === "cash_on_delivery") cash.classList.remove("hidden");
  if (r?.file_url) {
    receiptBox.classList.remove("hidden");
    document.getElementById("receipt-img").src = r.file_url;
  }
}

/* -----------------------------------------------------------
   CONTROLS
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter").addEventListener("change", async e => {
    currentStatus = e.target.value;

    if (currentStatus === "new") {
      await loadOrders(); // recarga solo nuevos
    } else {
      await loadOrdersByStatus(currentStatus);
    }

    applyFilters();
    renderCarousel();
    filtered.length ? forceSelectFirst() : showEmpty();
  });

  document.getElementById("search-orders").addEventListener("input", e => {
    search = e.target.value.trim();
    applyFilters();
    renderCarousel();
    filtered.length ? forceSelectFirst() : showEmpty();
  });

  document.getElementById("btnBackOrders").addEventListener("click", () => {
    document.getElementById("admin-order-preview").classList.add("hidden");
    const related = document.querySelector(".admin-related");
    related.style.display = "";
    related.classList.remove("hidden");
  });
}

/* -----------------------------------------------------------
   EMPTY
----------------------------------------------------------- */
function showEmpty() {
  document.getElementById("admin-order-preview").classList.add("hidden");
  document.querySelector(".admin-related").classList.add("hidden");
  document.getElementById("admin-empty-state").classList.remove("hidden");
}
