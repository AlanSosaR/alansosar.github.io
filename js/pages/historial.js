const sb = () => window.supabaseClient;

const CART_KEY = "cafecortero_cart";
const EMPTY_BASE = window.location.origin + "/imagenes/empty/";

let orders = [];
let filteredOrders = [];
let activeIndex = -1;
let currentSearch = "";
let currentFilter = "delivered";
let currentPage = 1;
const itemsPerPage = 5;

const $id = (id) => document.getElementById(id);

const STATUS_LABELS = {
  delivered: "Entregado",
  cancelled: "Cancelado"
};

const STATUS_DOT = {
  delivered: "delivered",
  cancelled: "cancelled"
};

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return {
    fecha: d.toLocaleDateString("es-HN", {
      day: "2-digit", month: "short", year: "numeric"
    }),
    hora: d.toLocaleTimeString("es-HN", {
      hour: "2-digit", minute: "2-digit"
    })
  };
}

function normalizeOrderNumber(num) {
  return String(num ?? "").padStart(3, "0");
}

function isCashPayment(method) {
  return method === "cash_on_delivery" || method === "cash";
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await esperarSupabase();
  const { data } = await sb().auth.getSession();
  if (!data?.session) return;

  await loadOrders(data.session.user.id);
  bindHeaderEvents();

  if (!orders.length) {
    renderEmpty("delivered");
    return;
  }

  const statusPriority = ["delivered", "cancelled"];
  let detected = "delivered";
  for (const s of statusPriority) {
    if (orders.some(o => o.status === s)) {
      detected = s;
      break;
    }
  }
  currentFilter = detected;

  const filterEl = document.getElementById("header-status-filter");
  if (filterEl) filterEl.value = detected;

  applyLocalFilters();

  const savedId = sessionStorage.getItem("selectedOrderId");
  if (savedId) {
    const idx = filteredOrders.findIndex(o => String(o.id) === savedId);
    if (idx >= 0) {
      selectOrder(idx);
    }
  }

  $id("list-prev")?.addEventListener("click", () => changePage(-1));
  $id("list-next")?.addEventListener("click", () => changePage(1));

  const list = $id("orders-list");
  if (list) {
    list.addEventListener("click", (e) => {
      const card = e.target.closest(".order-card-item-stitch");
      if (card && card.dataset.index !== undefined) {
        selectOrder(Number(card.dataset.index));
      }
    });
  }

}

/* =========================
   HEADER EVENTS
========================= */
function bindHeaderEvents() {
  document.addEventListener("header:search", (e) => {
    currentSearch = String(e.detail || "").toLowerCase().trim();
    applyLocalFilters();
  });

  document.addEventListener("header:filter", (e) => {
    currentFilter = e.detail || "all";
    applyLocalFilters();
  });
}

/* =========================
   FILTERS
========================= */
function applyLocalFilters() {
  filteredOrders = orders.filter((o) => {
    let matchStatus = true;
    if (currentFilter !== "all") {
      const map = {
        delivered: ["delivered"],
        cancelled: ["cancelled"]
      };
      matchStatus = (map[currentFilter] || []).includes(o.status);
    }

    let matchSearch = true;
    if (currentSearch) {
      const byNumber =
        String(o.order_number).includes(currentSearch) ||
        normalizeOrderNumber(o.order_number).includes(currentSearch);
      const byProduct = o.items?.some((i) =>
        i.products?.name?.toLowerCase().includes(currentSearch)
      );
      matchSearch = byNumber || byProduct;
    }

    return matchStatus && matchSearch;
  });

  $id("empty-state")?.classList.add("hidden");
  activeIndex = -1;
  currentPage = 1;

  if (!filteredOrders.length) {
    showEmptyFilter();
    return;
  }

  showListAndDetail();
  renderOrderList(true);

  if (window.innerWidth > 768) {
    selectOrder(0);
  } else {
    document.body.classList.remove("detail-view-active");
    $id("order-detail")?.classList.add("hidden");
    $id("no-selection")?.classList.remove("hidden");
  }
}

/* =========================
   EMPTY / VISIBILITY
========================= */
function renderEmpty(filter) {
  const empty = $id("empty-state");
  if (!empty) return;
  $id("main-layout-stitch")?.classList.add("hidden");

  const title = empty.querySelector(".empty-title");
  const text = empty.querySelector(".empty-text");
  const img = empty.querySelector(".empty-illustration");

  const config = {
    delivered: ["Sin entregas aún", "Aquí verás tu historial de pedidos.", "delivered.svg"],
    cancelled: ["Sin pedidos cancelados", "¡Excelente! No tienes compras canceladas.", "cancelled.svg"]
  };

  const [t, d, imgName] = config[filter] || config.delivered;
  title.textContent = t;
  text.textContent = d;
  img.src = EMPTY_BASE + imgName;
  img.alt = t;
  empty.classList.remove("hidden");
}

function showEmptyFilter() {
  $id("main-layout-stitch")?.classList.remove("hidden");
  $id("orders-list").innerHTML = '<div class="loading-state">Sin pedidos para este filtro</div>';
  $id("order-detail")?.classList.add("hidden");
  $id("no-selection")?.classList.remove("hidden");
}

function showListAndDetail() {
  $id("empty-state")?.classList.add("hidden");
  $id("main-layout-stitch")?.classList.remove("hidden");
}

/* =========================
   LOAD ORDERS
========================= */
async function loadOrders(userId) {
  const { data } = await sb()
    .from("orders")
    .select(`
      id, order_number, total, status, payment_method, created_at, order_notes,
      address:addresses ( street, city ),
      items:order_items ( quantity, price, product_id, products ( id, name, image_url ) )
    `)
    .eq("user_id", userId)
    .in("status", ["delivered", "cancelled"])
    .order("created_at", { ascending: false });

  orders = data || [];
}

/* =========================
   RENDER ORDER LIST
========================= */
function renderOrderList(resetSelection = true) {
  const wrap = $id("orders-list");
  const tpl = $id("tpl-order-card");
  if (!wrap || !tpl) return;

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredOrders.slice(start, start + itemsPerPage);

  renderPageButtons();

  wrap.innerHTML = "";

  pageItems.forEach((o, pageIndex) => {
    const globalIndex = start + pageIndex;
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".order-card-item-stitch");
    const { fecha } = formatDateTime(o.created_at);

    node.querySelector(".card-order-number").textContent = `#${normalizeOrderNumber(o.order_number)}`;
    node.querySelector(".card-date").textContent = fecha;
    node.querySelector(".card-total").textContent = `L ${o.total.toFixed(2)}`;
    node.querySelector(".card-status-label").textContent = STATUS_LABELS[o.status] || o.status;

    const dot = node.querySelector(".card-status-dot");
    dot.classList.add(o.status);

    if (globalIndex === activeIndex) card.classList.add("active");

    card.dataset.index = globalIndex;
    wrap.appendChild(node);
  });

  $id("orders-count-stitch").textContent = filteredOrders.length;
}

/* =========================
   SELECT & RENDER DETAIL
========================= */
async function selectOrder(index) {
  if (!filteredOrders[index]) return;
  if (index === activeIndex) return;
  activeIndex = index;

  document.querySelectorAll(".order-card-item-stitch").forEach((c) => c.classList.remove("active"));

  const cards = document.querySelectorAll(".order-card-item-stitch");
  const start = (currentPage - 1) * itemsPerPage;
  const pageIndex = index - start;
  if (cards[pageIndex]) {
    cards[pageIndex].classList.add("active");
    cards[pageIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  document.body.classList.add("detail-view-active");
  sessionStorage.setItem("selectedOrderId", filteredOrders[index].id);

  await renderDetail(filteredOrders[index]);
}

/* =========================
   PAGINATION
========================= */
function changePage(delta) {
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const newPage = currentPage + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderOrderList(false);
  }
}

function renderPageButtons() {
  const numbersDiv = $id("list-page-numbers");
  if (!numbersDiv) return;
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  numbersDiv.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      renderOrderList(false);
      const list = $id("orders-list");
      if (list) list.scrollTop = 0;
    };
    numbersDiv.appendChild(btn);
  }
}

async function renderDetail(pedido) {
  const detail = $id("order-detail");
  const content = $id("order-detail-content");
  const noSel = $id("no-selection");
  if (!detail || !content) return;

  detail.classList.remove("hidden");
  noSel?.classList.add("hidden");
  content.classList.remove("hidden");

  const { fecha, hora } = formatDateTime(pedido.created_at);

  $id("order-id-display").textContent = `Pedido #${normalizeOrderNumber(pedido.order_number)}`;

  const badge = $id("order-status-badge");
  badge.textContent = STATUS_LABELS[pedido.status]?.toUpperCase() || pedido.status.toUpperCase();
  badge.className = `status-badge-stitch ${pedido.status}`;

  $id("p-method").textContent =
    pedido.payment_method === "cash_on_delivery" || pedido.payment_method === "cash"
      ? "Pago en mano" : "Transferencia";
  $id("p-date").textContent = `${fecha} · ${hora}`;
  $id("p-total").textContent = `L ${pedido.total.toFixed(2)}`;

  $id("o-address").textContent = pedido.address
    ? `${pedido.address.street}, ${pedido.address.city}`
    : "—";
  $id("o-reference").textContent = pedido.order_notes || "Sin referencia";

  // Products
  const itemsList = $id("order-items-list");
  itemsList.innerHTML = "";
  if (pedido.items) {
    pedido.items.forEach((item) => {
      const imgUrl = item.products?.image_url
        ? item.products.image_url.startsWith("http")
          ? item.products.image_url
          : `https://${item.products.image_url}`
        : null;
      const row = document.createElement("div");
      row.className = "item-mini-row";
      row.innerHTML = `
        ${imgUrl ? `<img src="${imgUrl}" alt="${item.products?.name || ''}" class="item-mini-img" onerror="this.style.display='none'">` : ''}
        <span class="item-name">${item.products?.name || "Café"}</span>
        <div class="item-meta">
          <span class="item-qty">×${item.quantity}</span>
          <span class="item-price">L ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `;
      itemsList.appendChild(row);
    });
  }

  // Rating section (solo delivered)
  const ratingSection = $id("rating-section");
  if (pedido.status === "delivered" && pedido.items?.length) {
    ratingSection?.classList.remove("hidden");
    await renderRatingItems(pedido);
  } else {
    ratingSection?.classList.add("hidden");
  }

  detail.scrollTop = 0;
}

/* =========================
   RATING STARS — UNICA POR PEDIDO
========================= */
async function renderRatingItems(pedido) {
  const container = $id("rating-items-container");
  if (!container) return;

  const { data } = await sb().auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) return;

  container.innerHTML = "";

  const orderId = pedido?.id;
  if (!orderId) {
    container.innerHTML = '<p style="color:#6B6B6B;font-size:13px;text-align:center;padding:16px">Error al cargar la reseña.</p>';
    return;
  }

  // Verificar si ya existe reseña para este pedido
  let existingReview = null;
  let selectedRating = 0;
  let currentComment = "";
  try {
    const { data: revData } = await sb()
      .from("reviews")
      .select("rating, comment")
      .eq("order_id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    existingReview = revData;
    selectedRating = existingReview?.rating || 0;
    currentComment = existingReview?.comment || "";
  } catch (e) {
    console.warn("⚠️ Error al cargar review:", e);
  }

  const hasReview = !!existingReview;

  // ---- CARD ----
  const card = document.createElement("div");
  card.style.cssText = "background:#fff;border:1px solid #DDE2DF;border-radius:12px;padding:16px;margin-bottom:12px";

  // Header con los productos del pedido
  const header = document.createElement("div");
  header.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px";

  const label = document.createElement("span");
  label.style.cssText = "font-size:12px;font-weight:600;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.5px;width:100%";
  label.textContent = "Tu pedido incluyó:";
  header.appendChild(label);

  if (pedido.items) {
    pedido.items.forEach((item) => {
      const imgUrl = item.products?.image_url
        ? item.products.image_url.startsWith("http")
          ? item.products.image_url
          : `https://${item.products.image_url}`
        : null;
      const chip = document.createElement("span");
      chip.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#F1F3F2;border-radius:20px;padding:4px 12px 4px 6px;font-size:12px;color:#191C1C";
      chip.innerHTML = `
        ${imgUrl ? `<img src="${imgUrl}" alt="" style="width:20px;height:20px;object-fit:contain;border-radius:4px" onerror="this.style.display='none'">` : ''}
        ${item.products?.name || "Café"} ×${item.quantity}
      `;
      header.appendChild(chip);
    });
  }
  card.appendChild(header);

  // Textarea
  const ta = document.createElement("textarea");
  ta.style.cssText = "width:100%;padding:10px 12px;border:1px solid #DDE2DF;border-radius:8px;font-family:Roboto,sans-serif;font-size:13px;color:#191C1C;resize:vertical;min-height:48px;box-sizing:border-box";
  ta.placeholder = "¿Qué te pareció tu pedido? Cuéntanos tu experiencia...";

  if (hasReview) {
    ta.value = currentComment;
    ta.disabled = true;
    ta.style.background = "#F1F3F2";
    card.appendChild(ta);

    const starsWrap = document.createElement("div");
    starsWrap.style.cssText = "display:flex;gap:4px;font-size:28px;line-height:1;margin-top:8px";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = "★";
      star.style.color = i <= selectedRating ? "#F9A825" : "#E0E0E0";
      starsWrap.appendChild(star);
    }
    card.appendChild(starsWrap);

    const saved = document.createElement("span");
    saved.style.cssText = "display:flex;align-items:center;gap:4px;font-size:12px;color:#377B4C;font-weight:500;margin-top:8px";
    saved.innerHTML = '<span style="font-size:14px" class="material-symbols-outlined">check_circle</span> Reseña enviada — gracias por tu opinión';
    card.appendChild(saved);
  } else {
    card.appendChild(ta);

    // Estrellas
    const starsWrap = document.createElement("div");
    starsWrap.style.cssText = "display:flex;gap:4px;font-size:28px;line-height:1;cursor:pointer;user-select:none;margin-top:8px";
    starsWrap.className = "rating-stars";

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = "★";
      star.className = "star";
      star.style.cssText = "transition:color 0.15s,transform 0.1s";
      star.style.color = i <= selectedRating ? "#F9A825" : "#E0E0E0";
      star.dataset.value = String(i);
      starsWrap.appendChild(star);
    }
    card.appendChild(starsWrap);

    // Botón
    const btnSave = document.createElement("button");
    btnSave.className = "btn-send-review";
    btnSave.textContent = "Enviar reseña";

    const errorMsg = document.createElement("span");
    errorMsg.style.cssText = "display:none;font-size:12px;color:#C62828;margin-top:6px";

    card.appendChild(btnSave);
    card.appendChild(errorMsg);

    // Click estrellas
    starsWrap.addEventListener("click", (e) => {
      const span = e.target.closest(".star");
      if (!span) return;
      const val = Number(span.dataset.value);
      if (!val) return;
      selectedRating = val;
      starsWrap.querySelectorAll(".star").forEach((s, idx) => {
        s.style.color = idx < val ? "#F9A825" : "#E0E0E0";
      });
      errorMsg.style.display = "none";
    });

    // Click guardar
    btnSave.addEventListener("click", async () => {
      if (!selectedRating || selectedRating < 1) {
        errorMsg.textContent = "Por favor selecciona al menos 1 estrella.";
        errorMsg.style.display = "block";
        return;
      }
      btnSave.disabled = true;
      btnSave.textContent = "Guardando...";

      const comment = ta.value.trim();
      try {
        const { error } = await sb().from("reviews").upsert({
          order_id: orderId,
          user_id: userId,
          rating: selectedRating,
          comment: comment
        }, { onConflict: "order_id, user_id" });

        if (error) throw error;

        starsWrap.style.cursor = "default";
        ta.disabled = true;
        ta.style.background = "#F1F3F2";
        btnSave.remove();
        errorMsg.remove();

        const saved = document.createElement("span");
        saved.style.cssText = "display:flex;align-items:center;gap:4px;font-size:12px;color:#377B4C;font-weight:500;margin-top:8px";
        saved.innerHTML = '<span style="font-size:14px" class="material-symbols-outlined">check_circle</span> Reseña enviada — gracias por tu opinión';
        card.appendChild(saved);
      } catch (err) {
        console.error("⚠️ Error al guardar review:", err);
        btnSave.disabled = false;
        btnSave.textContent = "Intentar de nuevo";
        errorMsg.textContent = "Error al guardar. Revisa tu conexión.";
        errorMsg.style.display = "block";
      }
    });
  }

  container.appendChild(card);
}

/* =========================
   SUPABASE READY
========================= */
function esperarSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) { clearInterval(i); resolve(); }
    }, 50);
  });
}

/* =========================
   MOBILE BACK
========================= */
$id("btn-back-to-list")?.addEventListener("click", () => {
  document.body.classList.remove("detail-view-active");
  $id("order-detail")?.classList.add("hidden");
  $id("no-selection")?.classList.add("hidden");
  sessionStorage.removeItem("selectedOrderId");
});
