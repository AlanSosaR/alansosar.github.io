/* ============================================================
   MAIN.JS — Café Cortero 2025 (FINAL ESTABLE)
   UI + CARRITO + INTERACCIONES
   ✅ Header controla contador
============================================================ */

/* ========================= SAFE ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= EMPTY CATALOG ========================= */
function showEmptyCatalog() {
  safe("empty-catalog")?.classList.remove("hidden");
  document.querySelector(".product-main")?.classList.add("hidden");
  document.querySelector(".related")?.classList.add("hidden");
}

function hideEmptyCatalog() {
  safe("empty-catalog")?.classList.add("hidden");
  document.querySelector(".product-main")?.classList.remove("hidden");
  document.querySelector(".related")?.classList.remove("hidden");
}

/* ========================= CARRITO ========================= */
const CART_KEY = "cafecortero_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* 🔑 HEADER CONTROLA BADGE */
function syncHeaderCounter() {
  if (typeof window.updateHeaderCartCount === "function") {
    window.updateHeaderCartCount();
  }
}

function animateCartBadge() {
  const badge = safe("cart-count");
  if (!badge) return;
  badge.classList.remove("animate");
  void badge.offsetWidth;
  badge.classList.add("animate");
}

function addToCart(product) {
  const cart = getCart();
  const index = cart.findIndex(p => p.product_id === product.product_id);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  syncHeaderCounter();
  animateCartBadge();
}

/* =========================
   RENDER PRODUCTO PRINCIPAL
   🔑 (ANTES NO EXISTÍA)
========================= */
function renderMainProduct(product) {
  safe("product-name").textContent = product.name || "";
  safe("product-description").textContent = product.description || "";

  const badge = [
    product.category,
    product.grind_type,
    product.presentation
  ].filter(Boolean).join(" · ");

  safe("product-badge").textContent = badge;
  safe("product-price").textContent = `L ${product.price}`;

  const img = safe("product-image");
  img.src = product.image_url || "imagenes/no-image.png";
  img.onerror = () => img.src = "imagenes/no-image.png";

  const addBtn = safe("product-add");
  addBtn.dataset.id = product.id;
  addBtn.dataset.stock = product.stock ?? 0;

  safe("qty-number").textContent = "1";
}

/* ========================= SIMILARES (DESDE BD) ========================= */
async function loadSimilarProducts() {
  const cont = safe("lista-similares");
  if (!cont) return;

const { data, error } = await window.supabaseClient
  .from("products")
  .select("*")
  .eq("featured", true)
  .eq("status", "activo")
  .gt("stock", 0) // 📦 solo con stock
  .order("created_at", { ascending: false });

  if (error || !data || !data.length) {
    cont.innerHTML = "";
    showEmptyCatalog();
    return;
  }

  hideEmptyCatalog();

  cont.innerHTML = data.map(p => `
    <div class="similar-card"
      data-id="${p.id}"
      data-name="${p.name}"
      data-price="L ${p.price}"
      data-img="${p.image_url || "imagenes/no-image.png"}"
      data-description="${p.description || ""}"
      data-category="${p.category || ""}"
      data-grind="${p.grind_type || ""}"
      data-presentation="${p.presentation || ""}"
      data-stock="${p.stock ?? 0}"
    >
      <img src="${p.image_url || "imagenes/no-image.png"}"
           onerror="this.src='imagenes/no-image.png'">
      <h4>${p.name}</h4>
      <div class="price-sm">L ${p.price}</div>
    </div>
  `).join("");

  bindSimilarCardEvents();
  initDefaultProduct();
  initSimilarCarousel();
}

/* ========================= CARRUSEL — ESTADO ========================= */
let similarIndex = 0;
const setSimilarIndex = i => similarIndex = i;
const getSimilarIndex = () => similarIndex;

/* ========================= INIT PRODUCTO DEFAULT ========================= */
function initDefaultProduct() {
  const firstCard = document.querySelector(".similar-card");
  if (!firstCard) return;

  renderMainProduct({
    id: firstCard.dataset.id,
    name: firstCard.dataset.name,
    description: firstCard.dataset.description,
    category: firstCard.dataset.category,
    grind_type: firstCard.dataset.grind,
    presentation: firstCard.dataset.presentation,
    price: Number(firstCard.dataset.price.replace(/[^\d.]/g, "")),
    stock: Number(firstCard.dataset.stock || 0),
    image_url: firstCard.dataset.img
  });

  document.querySelectorAll(".similar-card")
    .forEach(c => c.classList.remove("active-card"));

  firstCard.classList.add("active-card");
  setSimilarIndex(0);
}

/* ========================= SIMILAR EVENTS ========================= */
function bindSimilarCardEvents() {
  const cards = document.querySelectorAll(".similar-card");
  const productSection = document.querySelector(".product-main");

  cards.forEach((card, idx) => {
    card.addEventListener("mousedown", e => e.preventDefault());

    card.addEventListener("click", () => {
      setSimilarIndex(idx);

      cards.forEach(c => c.classList.remove("active-card"));
      card.classList.add("active-card");

      renderMainProduct({
        id: card.dataset.id,
        name: card.dataset.name,
        description: card.dataset.description,
        category: card.dataset.category,
        grind_type: card.dataset.grind,
        presentation: card.dataset.presentation,
        price: Number(card.dataset.price.replace(/[^\d.]/g, "")),
        stock: Number(card.dataset.stock || 0),
        image_url: card.dataset.img
      });

      productSection?.scrollIntoView({ behavior: "smooth" });
      updateSimilarUI();
    });
  });
}

/* ========================= CARRUSEL UI ========================= */
function initSimilarCarousel() {
  const prev = safe("similar-prev");
  const next = safe("similar-next");
  const dots = document.querySelectorAll(".carousel-dots .dot");

  prev && (prev.onclick = () => {
    if (similarIndex > 0) {
      similarIndex--;
      updateSimilarUI();
    }
  });

  next && (next.onclick = () => {
    if (similarIndex < dots.length - 1) {
      similarIndex++;
      updateSimilarUI();
    }
  });

  dots.forEach((dot, i) => {
    dot.onclick = () => {
      similarIndex = i;
      updateSimilarUI();
    };
  });

  updateSimilarUI();
}

function updateSimilarUI() {
  const list = safe("lista-similares");
  if (!list) return;

  const cards = list.querySelectorAll(".similar-card");
  if (!cards.length) return;

  const gap = parseInt(getComputedStyle(list).gap || 16, 10);
  list.scrollTo({
    left: (cards[0].offsetWidth + gap) * similarIndex,
    behavior: "smooth"
  });

  cards.forEach((c, i) =>
    c.classList.toggle("active-card", i === similarIndex)
  );
}

/* ========================= DOM READY ========================= */
document.addEventListener("DOMContentLoaded", () => {

  syncHeaderCounter();

  /* ========================= FAB ========================= */
  const fabContainer = safe("fab");
  const fabMain = safe("fab-main");

  fabMain?.addEventListener("click", e => {
    e.stopPropagation();
    fabContainer.classList.toggle("active");
  });

  document.addEventListener("click", e => {
    if (fabContainer && !fabContainer.contains(e.target)) {
      fabContainer.classList.remove("active");
    }
  });

  loadSimilarProducts(); // 🔑 TODO ARRANCA AQUÍ
});
