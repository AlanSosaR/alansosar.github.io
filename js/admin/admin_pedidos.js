/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO
============================================================ */

console.log("🛠️ admin-pedidos.js — INIT");

const sb = window.supabaseClient;
if (!sb) throw new Error("❌ Supabase no inicializado");

/* =========================
   STATE
========================= */
let orders = [];
let filtered = [];
let activeIndex = 0;
let currentStatus = "new";
let search = "";
let pendingAction = null;
let userSelected = false;

/* =========================
   STATUS MAP
========================= */
const STATUS_GROUPS = {
  new: ["pending"],
  processing: ["processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  cancelled: ["cancelled"]
};

const STATUS_LABELS = {
  pending: "Nuevo",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado"
};

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
  if (!user || user.rol !== "admin") return;

  bindControls();
  bindSnackbar();

  await loadOrdersByStatus(currentStatus);
  renderCarousel();

  if (filtered.length) {
    selectOrderByIndex(0);
  } else {
    showEmpty();
  }
}

/* =========================
   LOAD ORDERS
========================= */
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
  if (statuses) query = query.in("status", statuses);

  const { data, error } = await query;
  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    orders = [];
    filtered = [];
    return;
  }

  orders = data || [];
  filtered = [...orders];
}

/* =========================
   GLOBAL SEARCH (HEADER)
========================= */
function applyGlobalSearch(query) {
  if (!query) {
    filtered = [...orders];
    return;
  }

  const q = query.toLowerCase();

  filtered = orders.filter(o => {
    return (
      String(o.order_number).includes(q) ||

      (o.users?.name || "").toLowerCase().includes(q) ||
      (o.users?.email || "").toLowerCase().includes(q) ||

      (o.address?.phone || "").includes(q) ||
      (o.address?.city || "").toLowerCase().includes(q) ||
      (o.address?.state || "").toLowerCase().includes(q) ||

      (STATUS_LABELS[o.status] || "")
        .toLowerCase()
        .includes(q)
    );
  });
}

/* =========================
   CARRUSEL
========================= */
function renderCarousel() {
  applyGlobalSearch(search);

  const wrap = document.getElementById("orders-carousel");
  const tpl = document.getElementById("tpl-order-card");
  const related = document.querySelector(".admin-related");

  wrap.innerHTML = "";

  if (!filtered.length) {
    related.classList.add("hidden");
    showEmpty();
    return;
  }

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
      STATUS_LABELS[o.status] || o.status;

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
      userSelected = true;
      selectOrderByIndex(index);
    };

    wrap.appendChild(node);
  });

  requestAnimationFrame(() => {
    applySelection();
    bindCarouselArrows();
  });
}

/* =========================
   SELECT ORDER
========================= */
function selectOrderByIndex(index) {
  if (!filtered[index]) return;

  activeIndex = index;
  applySelection();

  const preview = document.getElementById("admin-order-preview");
  preview.classList.remove("hidden");
  document.getElementById("admin-empty-state").classList.add("hidden");

  renderPreview(filtered[index]);

  if (userSelected) {
    explainScrollToPreview();
    userSelected = false;
  }
}

function explainScrollToPreview() {
  const preview = document.getElementById("admin-order-preview");
  requestAnimationFrame(() => {
    preview.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function applySelection() {
  document.querySelectorAll(".order-card")
    .forEach(c => c.classList.remove("is-selected"));

  const card = document.querySelector(
    `.order-card[data-index="${activeIndex}"]`
  );
  card?.classList.add("is-selected");
}

/* =========================
   PREVIEW
========================= */
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
        <span class="pill-name">${item.products?.name} · ${item.quantity} bolsas</span>
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

  renderMedia(o);
  renderStatusActions(o);
}

/* =========================
   MEDIA
========================= */
function renderMedia(o) {
  const media = document.getElementById("order-media");
  const cash = document.getElementById("cash-payment");
  const receipt = document.getElementById("receipt-payment");

  media.classList.remove("hidden");
  cash.classList.add("hidden");
  receipt.classList.add("hidden");

  if (o.receipt?.[0]?.file_url) {
    receipt.classList.remove("hidden");
    document.getElementById("receipt-img").src = o.receipt[0].file_url;
  } else {
    cash.classList.remove("hidden");
  }
}

/* =========================
   STATUS ACTIONS
========================= */
function renderStatusActions(o) {
  const btnAccept = document.getElementById("btnAccept");
  const btnReject = document.getElementById("btnReject");
  const btnShip = document.getElementById("btnShip");
  const btnDeliver = document.getElementById("btnDeliver");

  [btnAccept, btnReject, btnShip, btnDeliver]
    .forEach(b => b.classList.add("hidden"));

  if (o.status === "pending") {
    btnAccept.classList.remove("hidden");
    btnReject.classList.remove("hidden");

    btnAccept.onclick = () =>
      openSnackbar(
        "Pasar a preparación",
        "¿Deseas marcar este pedido como En preparación?",
        () => updateStatus(o.id, "processing")
      );

    btnReject.onclick = () =>
      openSnackbar(
        "Cancelar pedido",
        "Esta acción no se puede deshacer",
        () => updateStatus(o.id, "cancelled")
      );
  }

  if (o.status === "processing") {
    btnShip.classList.remove("hidden");
    btnShip.onclick = () =>
      openSnackbar(
        "Marcar como enviado",
        "Confirma el envío del pedido",
        () => updateStatus(o.id, "shipped")
      );
  }

  if (o.status === "shipped") {
    btnDeliver.classList.remove("hidden");
    btnDeliver.onclick = () =>
      openSnackbar(
        "Marcar como entregado",
        "Confirma entrega al cliente",
        () => updateStatus(o.id, "delivered")
      );
  }
}

/* =========================
   UPDATE STATUS
========================= */
async function updateStatus(orderId, newStatus) {
  await sb.from("orders").update({ status: newStatus }).eq("id", orderId);

  await loadOrdersByStatus(currentStatus);
  renderCarousel();

  if (filtered.length) {
    activeIndex = 0;
    selectOrderByIndex(0);
  } else {
    showEmpty();
  }
}

/* =========================
   SNACKBAR (FIX DEFINITIVO)
========================= */
function openSnackbar(title, message, onConfirm) {
  const box = document.getElementById("snackbar-action");
  const btnConfirm = document.getElementById("snackbar-confirm");
  const btnCancel = document.getElementById("snackbar-cancel");

  document.getElementById("snackbar-title").textContent = title;
  document.getElementById("snackbar-message").textContent = message;

  // Limpia handlers anteriores (CRÍTICO)
  btnConfirm.onclick = null;
  btnCancel.onclick = null;

  pendingAction = onConfirm;

  btnConfirm.onclick = async () => {
    box.classList.add("hidden");

    const action = pendingAction;
    pendingAction = null;

    if (typeof action === "function") {
      await action();
    }
  };

  btnCancel.onclick = () => {
    pendingAction = null;
    box.classList.add("hidden");
  };

  box.classList.remove("hidden");
}

/* =========================
   CONTROLS (GLOBAL HEADER) — FIX REAL
========================= */
function bindControls() {
  /* ---------- FILTRO POR ESTADO ---------- */
  document.addEventListener("header:filter", async e => {
    currentStatus = e.detail;
    userSelected = false;

    await loadOrdersByStatus(currentStatus);
    renderCarousel();

    if (filtered.length) {
      activeIndex = 0;
      selectOrderByIndex(0);
    } else {
      showEmpty();
    }
  });

  /* ---------- BUSCADOR GLOBAL ---------- */
  document.addEventListener("header:search", e => {
    search = (e.detail || "").trim();
    userSelected = false;

    renderCarousel();

    if (filtered.length) {
      activeIndex = 0;
      selectOrderByIndex(0);
    } else {
      showEmpty();
    }
  });
}

/* =========================
   CAROUSEL ARROWS
========================= */
function bindCarouselArrows() {
  const list = document.getElementById("orders-carousel");
  const btnPrev = document.getElementById("orders-prev");
  const btnNext = document.getElementById("orders-next");

  if (!list || !btnPrev || !btnNext) return;

  const STEP = list.clientWidth * 0.9;

  function update() {
    const max = list.scrollWidth - list.clientWidth;
    const atStart = list.scrollLeft <= 4;
    const atEnd = list.scrollLeft >= max - 4;

    btnPrev.classList.toggle("is-disabled", atStart);
    btnNext.classList.toggle("is-disabled", atEnd);
  }

  btnPrev.onclick = () =>
    list.scrollBy({ left: -STEP, behavior: "smooth" });

  btnNext.onclick = () =>
    list.scrollBy({ left: STEP, behavior: "smooth" });

  list.addEventListener("scroll", update);
  window.addEventListener("resize", update);

  requestAnimationFrame(update);
}

/* =========================
   EMPTY
========================= */
function showEmpty() {
  document.getElementById("admin-order-preview").classList.add("hidden");
  document.querySelector(".admin-related").classList.add("hidden");
  document.getElementById("admin-empty-state").classList.remove("hidden");
}
