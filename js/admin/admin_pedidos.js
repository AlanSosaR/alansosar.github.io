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
        email
      ),

      address:addresses (
        country,
        state,
        city,
        street,
        postal_code,
        full_name,
        phone
      ),

      items:order_items (
        quantity,
        price,
        products (
          name
        )
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
   FILTER — SOLO NÚMERO Y NOMBRE
----------------------------------------------------------- */
function applyFilters() {
  if (!search) {
    filtered = [...orders];
    return;
  }

  const q = search.toLowerCase();

  filtered = orders.filter(o => {
    const orderNum = String(o.order_number || "");
    const name = (o.users?.name || "").toLowerCase();
    return orderNum.includes(q) || name.includes(q);
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

    card.onclick = () => {
      activeIndex = index;
      renderAll();
    };

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

  document
    .querySelector(`.order-card[data-index="${index}"]`)
    ?.classList.add("is-selected");

  document.getElementById("admin-empty-state").classList.add("hidden");
  document.getElementById("admin-order-preview").classList.remove("hidden");

  renderPreview(order);
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

  document.getElementById("o-client-name").textContent =
    u.name || a.full_name || "Cliente";

  document.getElementById("o-phone").textContent =
    a.phone || "—";

  document.getElementById("o-email").textContent =
    u.email || "—";

  /* ---------- PÍLDORAS ---------- */
  const pills = document.getElementById("order-items-pills");
  pills.innerHTML = "";

  let total = 0;

  o.items?.forEach(item => {
    const qty = Number(item.quantity);
    const price = Number(item.price);
    const subtotal = qty * price;
    total += subtotal;

    const pill = document.createElement("div");
    pill.className = "order-pill";
    pill.innerHTML = `
      <span class="pill-name">☕ ${item.products?.name} · ${qty} bolsas</span>
      <span class="pill-price">L ${subtotal.toFixed(2)}</span>
    `;
    pills.appendChild(pill);
  });

  document.getElementById("o-total").textContent =
    `L ${total.toFixed(2)}`;

  document.getElementById("o-zone").textContent =
    [a.city, a.state].filter(Boolean).join(", ") || "—";

  document.getElementById("o-address").textContent =
    [a.street, a.city, a.state, a.country].filter(Boolean).join(", ") || "—";

  document.getElementById("o-reference").textContent =
    a.postal_code || "—";

  /* ---------- MEDIA ---------- */
  const media = document.getElementById("order-media");
  const cash = document.getElementById("cash-payment");
  const receiptBox = document.getElementById("receipt-payment");

  media.classList.add("hidden");
  cash.classList.add("hidden");
  receiptBox.classList.add("hidden");

  if (r?.file_url) {
    media.classList.remove("hidden");
    receiptBox.classList.remove("hidden");
    document.getElementById("receipt-img").src = r.file_url;
  } else {
    media.classList.remove("hidden");
    cash.classList.remove("hidden");
  }

  renderStatusActions(o);
}

/* -----------------------------------------------------------
   STATUS ACTIONS
----------------------------------------------------------- */
function renderStatusActions(o) {
  const chip = document.getElementById("o-status");

  const btnAccept = document.getElementById("btnAccept");
  const btnReject = document.getElementById("btnReject");
  const btnShip = document.getElementById("btnShip");
  const btnDeliver = document.getElementById("btnDeliver");

  [btnAccept, btnReject, btnShip, btnDeliver].forEach(b => b.classList.add("hidden"));

  if (o.status === "pending") {
    chip.className = "status-chip pending";
    chip.textContent = "Nuevo";

    btnAccept.classList.remove("hidden");
    btnReject.classList.remove("hidden");

    btnAccept.onclick = () => updateStatus(o.id, "processing");
    btnReject.onclick = () => updateStatus(o.id, "cancelled");
  }

  if (o.status === "processing") {
    chip.className = "status-chip preparing";
    chip.textContent = "En preparación";

    btnShip.classList.remove("hidden");
    btnShip.onclick = () => updateStatus(o.id, "shipped");
  }

  if (o.status === "shipped") {
    chip.className = "status-chip shipped";
    chip.textContent = "Enviado";

    btnDeliver.classList.remove("hidden");
    btnDeliver.onclick = () => updateStatus(o.id, "delivered");
  }

  if (o.status === "delivered") {
    chip.className = "status-chip delivered";
    chip.textContent = "Entregado";
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
   CONTROLS
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter").onchange = async e => {
    currentStatus = e.target.value;
    activeIndex = 0;
    await loadOrdersByStatus(currentStatus);
    renderAll();
  };

  document.getElementById("search-orders").oninput = e => {
    search = e.target.value.trim();
    activeIndex = 0;
    renderAll();
  };
}

/* -----------------------------------------------------------
   EMPTY
----------------------------------------------------------- */
function showEmpty() {
  document.getElementById("admin-order-preview").classList.add("hidden");
  document.querySelector(".admin-related").classList.add("hidden");
  document.getElementById("admin-empty-state").classList.remove("hidden");
}
