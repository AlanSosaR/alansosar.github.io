/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO (CORE FINAL REAL)
============================================================ */

console.log("🛠️ admin-pedidos.js — INIT");

const sb = window.supabaseClient;
if (!sb) throw new Error("❌ Supabase no inicializado");

/* -----------------------------------------------------------
   STATE
----------------------------------------------------------- */
let orders = [];
let filtered = [];
let activeIndex = 0;
let currentStatus = "new";
let search = "";

/* -----------------------------------------------------------
   STATUS MAP
----------------------------------------------------------- */
const STATUS_GROUPS = {
  new: ["pending"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"]
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

  document.getElementById("status-filter").value = "new";
  bindControls();
  await loadOrdersByStatus("new");
  renderAll();
}

/* -----------------------------------------------------------
   LOAD ORDERS
----------------------------------------------------------- */
async function loadOrdersByStatus(statusKey) {
  let query = sb
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
      ),

      address:addresses (
        country,
        state,
        city,
        street,
        phone,
        full_name
      ),

      items:order_items (
        quantity
      ),

      receipt:payment_receipts (
        file_url
      )
    `)
    .order("created_at", { ascending: false });

  const statuses = STATUS_GROUPS[statusKey];
  if (statuses?.length) query = query.in("status", statuses);

  const { data, error } = await query;
  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    orders = [];
    return;
  }

  orders = data || [];
}

/* -----------------------------------------------------------
   FILTER
----------------------------------------------------------- */
function applyFilters() {
  filtered = orders.filter(o => {
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
   RENDER ALL
----------------------------------------------------------- */
function renderAll() {
  applyFilters();

  if (!filtered.length) {
    showEmpty();
    return;
  }

  activeIndex = Math.min(activeIndex, filtered.length - 1);

  renderCarousel();
  selectOrderByIndex(activeIndex);
  updateArrows();
}

/* -----------------------------------------------------------
   CARRUSEL
----------------------------------------------------------- */
function renderCarousel() {
  const wrap = document.getElementById("orders-carousel");
  const tpl = document.getElementById("tpl-order-card");
  const related = document.querySelector(".admin-related");

  wrap.innerHTML = "";
  related.classList.remove("hidden");

  filtered.forEach((o, index) => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".order-card");

    card.dataset.index = index;

    node.querySelector(".o-card-number").textContent =
      `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;

    node.querySelector(".o-card-total").textContent =
      `L ${Number(o.total).toFixed(2)}`;

    node.querySelector(".o-card-status").textContent =
      STATUS_LABELS[o.status];

    const img = node.querySelector(".order-card-img");
    const placeholder = node.querySelector(".order-card-placeholder");
    const receipt = o.receipt?.[0];

    if (receipt?.file_url) {
      img.src = receipt.file_url;
      img.classList.remove("hidden");
      placeholder.classList.add("hidden");
    } else {
      img.classList.add("hidden");
      placeholder.classList.remove("hidden");
    }

    card.addEventListener("click", () => {
      activeIndex = index;
      renderAll();
    });

    wrap.appendChild(node);
  });
}

/* -----------------------------------------------------------
   SELECT ORDER
----------------------------------------------------------- */
function selectOrderByIndex(index) {
  const order = filtered[index];
  if (!order) return;

  document.querySelectorAll(".order-card")
    .forEach(c => c.classList.remove("is-selected"));

  const active = document.querySelector(`.order-card[data-index="${index}"]`);
  if (active) active.classList.add("is-selected");

  document.getElementById("admin-empty-state").classList.add("hidden");
  const preview = document.getElementById("admin-order-preview");
  preview.classList.remove("hidden");

  renderPreview(order);
}

/* -----------------------------------------------------------
   PREVIEW
----------------------------------------------------------- */
function renderPreview(o) {
  const u = o.users || {};
  const a = o.address || {};
  const r = o.receipt?.[0];

  /* =============================
     HEADER
  ============================== */
  document.getElementById("o-number").textContent =
    `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;

  document.getElementById("o-date").textContent =
    new Date(o.created_at).toLocaleString("es-HN");

  document.getElementById("o-client-name").textContent =
    u.name || a.full_name || "Cliente";

  document.getElementById("o-phone").textContent =
    u.phone || a.phone || "—";

  document.getElementById("o-email").textContent =
    u.email || "—";

  /* =============================
     ITEMS — DESGLOSE REAL (SIN TASA)
  ============================== */
  const itemsBox = document.getElementById("o-items");
  itemsBox.innerHTML = "";

  if (Array.isArray(o.items) && o.items.length) {
    o.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "order-item-row";
      row.innerHTML = `
        <span>${item.products?.name || "Producto"}</span>
        <strong>${item.quantity} bolsa${item.quantity !== 1 ? "s" : ""}</strong>
      `;
      itemsBox.appendChild(row);
    });
  } else {
    itemsBox.textContent = "—";
  }

  /* =============================
     TOTAL (SOLO MONTO, SIN TASA)
  ============================== */
  document.getElementById("o-total").textContent =
    `L ${Number(o.total).toFixed(2)}`;

  /* =============================
     DIRECCIÓN
  ============================== */
  document.getElementById("o-zone").textContent =
    [a.city, a.state].filter(Boolean).join(", ") || "—";

  document.getElementById("o-address").textContent =
    [a.street, a.city, a.state, a.country].filter(Boolean).join(", ") || "—";

  document.getElementById("o-reference").textContent = "—";

  /* =============================
     MEDIA (RECIBO / EFECTIVO)
  ============================== */
  const orderMedia = document.getElementById("order-media");
  const cash = document.getElementById("cash-payment");
  const receiptBox = document.getElementById("receipt-payment");

  orderMedia.classList.add("hidden");
  cash.classList.add("hidden");
  receiptBox.classList.add("hidden");

  if (r?.file_url) {
    orderMedia.classList.remove("hidden");
    receiptBox.classList.remove("hidden");
    document.getElementById("receipt-img").src = r.file_url;
  } else {
    orderMedia.classList.remove("hidden");
    cash.classList.remove("hidden");
  }

  renderStatusActions(o);
}

/* -----------------------------------------------------------
   STATUS ACTIONS
----------------------------------------------------------- */
function renderStatusActions(o) {
  const chip = document.getElementById("o-status");
  const btnMain = document.getElementById("btnShip");
  const btnDeliver = document.getElementById("btnDeliver");

  btnMain.classList.add("hidden");
  btnDeliver.classList.add("hidden");

  if (o.status === "pending") {
    chip.textContent = "Nuevo";
    chip.className = "status-chip pending";
    btnMain.textContent = "Aceptar pedido";
    btnMain.classList.remove("hidden");
    btnMain.onclick = () => updateStatus(o.id, "processing");
  }

  if (o.status === "processing") {
    chip.textContent = "En preparación";
    chip.className = "status-chip preparing";
    btnMain.textContent = "Marcar como enviado";
    btnMain.classList.remove("hidden");
    btnMain.onclick = () => updateStatus(o.id, "shipped");
  }

  if (o.status === "shipped") {
    chip.textContent = "Enviado";
    chip.className = "status-chip shipped";
    btnDeliver.classList.remove("hidden");
    btnDeliver.onclick = () => updateStatus(o.id, "delivered");
  }

  if (o.status === "delivered") {
    chip.textContent = "Entregado";
    chip.className = "status-chip delivered";
  }
}

/* -----------------------------------------------------------
   UPDATE STATUS
----------------------------------------------------------- */
async function updateStatus(orderId, newStatus) {
  const { error } = await sb
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    console.error("❌ Error actualizando estado:", error);
    return;
  }

  await loadOrdersByStatus(currentStatus);
  activeIndex = 0;
  renderAll();
}

/* -----------------------------------------------------------
   ARROWS
----------------------------------------------------------- */
function updateArrows() {
  const left = document.getElementById("arrow-left");
  const right = document.getElementById("arrow-right");

  if (!left || !right) return;

  left.disabled = activeIndex === 0;
  right.disabled = activeIndex === filtered.length - 1;

  left.onclick = () => {
    if (activeIndex > 0) {
      activeIndex--;
      renderAll();
    }
  };

  right.onclick = () => {
    if (activeIndex < filtered.length - 1) {
      activeIndex++;
      renderAll();
    }
  };
}

/* -----------------------------------------------------------
   CONTROLS
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter").addEventListener("change", async e => {
    currentStatus = e.target.value;
    activeIndex = 0;
    await loadOrdersByStatus(currentStatus);
    renderAll();
  });

  document.getElementById("search-orders").addEventListener("input", e => {
    search = e.target.value.trim();
    activeIndex = 0;
    renderAll();
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
