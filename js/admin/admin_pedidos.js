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
let pendingAction = null;

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
  delivered: "Entregado",
  cancelled: "Cancelado"
};

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
  if (!user || user.rol !== "admin") return;

  bindControls();
  bindCarouselArrows();
  bindSnackbar();

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
      users ( name, email ),
      address:addresses ( country, state, city, street, postal_code, phone, full_name ),
      items:order_items ( quantity, price, products ( name ) ),
      receipt:payment_receipts ( file_url )
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
  if (!search) {
    filtered = [...orders];
    return;
  }

  const q = search.toLowerCase();
  filtered = orders.filter(o =>
    String(o.order_number).includes(q) ||
    (o.users?.name || "").toLowerCase().includes(q)
  );
}

/* -----------------------------------------------------------
   RENDER
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
  document.querySelector(".admin-related").classList.remove("hidden");

  wrap.innerHTML = "";

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

    if (o.receipt?.[0]?.file_url) {
      img.src = o.receipt[0].file_url;
      img.classList.remove("hidden");
      placeholder.classList.add("hidden");
    } else {
      img.classList.add("hidden");
      placeholder.classList.remove("hidden");
    }

    card.onclick = () => {
      activeIndex = index;
      renderAll();
      document
        .getElementById("admin-order-preview")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    };

    wrap.appendChild(node);
  });
}

/* -----------------------------------------------------------
   SELECT
----------------------------------------------------------- */
function selectOrderByIndex(index) {
  document.querySelectorAll(".order-card")
    .forEach(c => c.classList.remove("is-selected"));

  document
    .querySelector(`.order-card[data-index="${index}"]`)
    ?.classList.add("is-selected");

  document.getElementById("admin-empty-state").classList.add("hidden");
  document.getElementById("admin-order-preview").classList.remove("hidden");

  renderPreview(filtered[index]);
}

/* -----------------------------------------------------------
   PREVIEW
----------------------------------------------------------- */
function renderPreview(o) {
  const u = o.users || {};
  const a = o.address || {};

  document.getElementById("o-number").textContent =
    `Pedido N.º ${String(o.order_number).padStart(3, "0")}`;

  document.getElementById("o-date").textContent =
    new Date(o.created_at).toLocaleString("es-HN");

  document.getElementById("o-client-name").textContent =
    u.name || a.full_name || "Cliente";

  document.getElementById("o-phone").textContent = a.phone || "—";
  document.getElementById("o-email").textContent = u.email || "—";

  const pills = document.getElementById("order-items-pills");
  pills.innerHTML = "";

  let total = 0;
  o.items?.forEach(item => {
    const subtotal = item.quantity * item.price;
    total += subtotal;

    pills.insertAdjacentHTML("beforeend", `
      <div class="order-pill">
        <span class="pill-name">☕ ${item.products?.name} · ${item.quantity} bolsas</span>
        <span class="pill-price">L ${subtotal.toFixed(2)}</span>
      </div>
    `);
  });

  document.getElementById("o-total").textContent = `L ${total.toFixed(2)}`;
  document.getElementById("o-zone").textContent =
    [a.city, a.state].filter(Boolean).join(", ") || "—";
  document.getElementById("o-address").textContent =
    [a.street, a.city, a.state, a.country].filter(Boolean).join(", ") || "—";
  document.getElementById("o-reference").textContent = a.postal_code || "—";

  const media = document.getElementById("order-media");
  const cash = document.getElementById("cash-payment");
  const receipt = document.getElementById("receipt-payment");

  media.classList.add("hidden");
  cash.classList.add("hidden");
  receipt.classList.add("hidden");

  if (o.receipt?.[0]?.file_url) {
    receipt.classList.remove("hidden");
    media.classList.remove("hidden");
    document.getElementById("receipt-img").src = o.receipt[0].file_url;
  } else {
    cash.classList.remove("hidden");
    media.classList.remove("hidden");
  }

  renderStatusActions(o);
}

/* -----------------------------------------------------------
   STATUS ACTIONS + SNACKBAR
----------------------------------------------------------- */
function renderStatusActions(o) {
  const chip = document.getElementById("o-status");
  const btnAccept = document.getElementById("btnAccept");
  const btnReject = document.getElementById("btnReject");
  const btnShip = document.getElementById("btnShip");
  const btnDeliver = document.getElementById("btnDeliver");

  [btnAccept, btnReject, btnShip, btnDeliver].forEach(b => b.classList.add("hidden"));

  chip.textContent = STATUS_LABELS[o.status];
  chip.className = `status-chip ${o.status}`;

  if (o.status === "pending") {
    btnAccept.classList.remove("hidden");
    btnReject.classList.remove("hidden");

    btnAccept.onclick = () =>
      openSnackbar("Pasar a preparación", "¿Deseas marcar este pedido como En preparación?", () =>
        updateStatus(o.id, "processing"));

    btnReject.onclick = () =>
      openSnackbar("Cancelar pedido", "Esta acción no se puede deshacer", () =>
        updateStatus(o.id, "cancelled"));
  }

  if (o.status === "processing") {
    btnShip.classList.remove("hidden");
    btnShip.onclick = () =>
      openSnackbar("Marcar como enviado", "Confirma el envío del pedido", () =>
        updateStatus(o.id, "shipped"));
  }

  if (o.status === "shipped") {
    btnDeliver.classList.remove("hidden");
    btnDeliver.onclick = () =>
      openSnackbar("Marcar como entregado", "Confirma entrega al cliente", () =>
        updateStatus(o.id, "delivered"));
  }
}

/* -----------------------------------------------------------
   UPDATE STATUS
----------------------------------------------------------- */
async function updateStatus(orderId, newStatus) {
  await sb.from("orders").update({ status: newStatus }).eq("id", orderId);
  await loadOrdersByStatus(currentStatus);
  renderAll();
}

/* -----------------------------------------------------------
   SNACKBAR
----------------------------------------------------------- */
function openSnackbar(title, message, onConfirm) {
  const sb = document.getElementById("snackbar-action");
  document.getElementById("snackbar-title").textContent = title;
  document.getElementById("snackbar-message").textContent = message;

  sb.classList.remove("hidden");
  pendingAction = onConfirm;
}

function bindSnackbar() {
  document.getElementById("snackbar-cancel").onclick = () => {
    document.getElementById("snackbar-action").classList.add("hidden");
    pendingAction = null;
  };

  document.getElementById("snackbar-confirm").onclick = () => {
    document.getElementById("snackbar-action").classList.add("hidden");
    pendingAction?.();
    pendingAction = null;
  };
}

/* -----------------------------------------------------------
   CONTROLS
----------------------------------------------------------- */
function bindControls() {
  document.getElementById("status-filter").onchange = async e => {
    currentStatus = e.target.value;
    await loadOrdersByStatus(currentStatus);
    renderAll();
  };

  document.getElementById("search-orders").oninput = e => {
    search = e.target.value.trim();
    renderAll();
  };
}

/* -----------------------------------------------------------
   CAROUSEL ARROWS
----------------------------------------------------------- */
function bindCarouselArrows() {
  const list = document.getElementById("orders-carousel");

  document.getElementById("orders-prev").onclick = () =>
    list.scrollBy({ left: -300, behavior: "smooth" });

  document.getElementById("orders-next").onclick = () =>
    list.scrollBy({ left: 300, behavior: "smooth" });
}

/* -----------------------------------------------------------
   EMPTY
----------------------------------------------------------- */
function showEmpty() {
  document.getElementById("admin-order-preview").classList.add("hidden");
  document.querySelector(".admin-related").classList.add("hidden");
  document.getElementById("admin-empty-state").classList.remove("hidden");
}
