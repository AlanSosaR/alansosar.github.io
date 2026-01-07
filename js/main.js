/* ============================================================
   MAIN.JS — Café Cortero 2025 (FINAL DEFINITIVO)
   UI + CARRITO + CARRUSELES + SUPABASE
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
  img.classList.remove("swap");
  void img.offsetWidth;
  img.classList.add("swap");

  img.src = product.image_url || "imagenes/no-image.png";
  img.onerror = () => img.src = "imagenes/no-image.png";

  const addBtn = safe("product-add");
  addBtn.dataset.id = product.id;
  addBtn.dataset.stock = product.stock ?? 0;

  /* ✅ ESTADO DINÁMICO (sin mostrar stock numérico) */
  const statusEl = safe("product-status");
  const stock = Number(product.stock ?? 0);

  if (statusEl) {
    statusEl.classList.remove("available", "low", "out");

    if (stock <= 0) {
      statusEl.textContent = "Agotado";
      statusEl.classList.add("out");
    } else if (stock <= 5) {
      statusEl.textContent = "Últimas unidades";
      statusEl.classList.add("low");
    } else {
      statusEl.textContent = "Disponible";
      statusEl.classList.add("available");
    }
  }

  safe("qty-number").textContent = "1";
}

/* =========================
   CARRUSEL — ESTADO
========================= */
let similarIndex = 0;

/* =========================
   DOTS DINÁMICOS
========================= */
function renderCarouselDots(count) {
  const dotsContainer = document.querySelector(".carousel-dots");
  if (!dotsContainer) return;

  dotsContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.className = "dot";
    if (i === 0) dot.classList.add("active");

    dot.onclick = () => {
      similarIndex = i;
      updateSimilarUI();
    };

    dotsContainer.appendChild(dot);
  }
}

/* =========================
   SIMILARES (DESDE BD)
========================= */
async function loadSimilarProducts() {
  const cont = safe("lista-similares");
  if (!cont) return;

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .eq("featured", true)
    .eq("status", "activo")
    .gt("stock", 0)
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
      data-price="${p.price}"
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

  renderCarouselDots(data.length);
  bindSimilarCardEvents();
  initDefaultProduct();
  initSimilarCarousel();
}

/* =========================
   PRODUCTO POR DEFECTO
========================= */
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
    price: Number(firstCard.dataset.price),
    stock: Number(firstCard.dataset.stock || 0),
    image_url: firstCard.dataset.img
  });

  document.querySelectorAll(".similar-card")
    .forEach(c => c.classList.remove("active-card"));

  firstCard.classList.add("active-card");
  similarIndex = 0;
}

/* =========================
   EVENTOS DE CARDS
========================= */
function bindSimilarCardEvents() {
  const cards = document.querySelectorAll(".similar-card");
  const productSection = document.querySelector(".product-main");

  cards.forEach((card, idx) => {
    card.addEventListener("mousedown", e => e.preventDefault());

    card.onclick = () => {
      similarIndex = idx;

      cards.forEach(c => c.classList.remove("active-card"));
      card.classList.add("active-card");

      renderMainProduct({
        id: card.dataset.id,
        name: card.dataset.name,
        description: card.dataset.description,
        category: card.dataset.category,
        grind_type: card.dataset.grind,
        presentation: card.dataset.presentation,
        price: Number(card.dataset.price),
        stock: Number(card.dataset.stock || 0),
        image_url: card.dataset.img
      });

      productSection?.scrollIntoView({ behavior: "smooth" });
      updateSimilarUI();
    };
  });
}

/* =========================
   CARRUSEL UI
========================= */
function initSimilarCarousel() {
  const prev = safe("similar-prev");
  const next = safe("similar-next");

  prev && (prev.onclick = () => {
    if (similarIndex > 0) {
      similarIndex--;
      updateSimilarUI();
    }
  });

  next && (next.onclick = () => {
    const cards = document.querySelectorAll(".similar-card");
    if (similarIndex < cards.length - 1) {
      similarIndex++;
      updateSimilarUI();
    }
  });

  // 🔑 esperar a que el navegador calcule tamaños reales
  requestAnimationFrame(() => {
    requestAnimationFrame(updateSimilarUI);
  });
}

function updateSimilarUI() {
  const list = safe("lista-similares");
  if (!list) return;

  const cards = list.querySelectorAll(".similar-card");
  const dots  = document.querySelectorAll(".carousel-dots .dot");
  if (!cards.length) return;

  // 🔑 medir tamaño REAL (no offsetWidth ciego)
  const rect = cards[0].getBoundingClientRect();
  if (rect.width === 0) return; // aún no visible

  const gap = parseInt(getComputedStyle(list).gap || 16, 10);
  const CARD_WIDTH = rect.width + gap;

  list.scrollTo({
    left: CARD_WIDTH * similarIndex, // <-- aquí
    behavior: "smooth"
  });

  cards.forEach((c, i) =>
    c.classList.toggle("active-card", i === similarIndex) // <-- aquí
  );

  dots.forEach((d, i) =>
    d.classList.toggle("active", i === similarIndex) // <-- y aquí
  );
}

/* =========================
   HERO CAROUSEL (IMÁGENES)
========================= */
function initHeroCarousel() {
  const images = document.querySelectorAll(".hero-carousel img");
  if (!images.length) return;

  let index = 0;

  images.forEach(img => img.classList.remove("active"));
  images[0].classList.add("active");

  setInterval(() => {
    images[index].classList.remove("active");
    index = (index + 1) % images.length;
    images[index].classList.add("active");
  }, 4000);
}
/* =========================
   DOM READY
========================= */
document.addEventListener("DOMContentLoaded", () => {

  syncHeaderCounter();
  initHeroCarousel(); // 👈 ESTA LÍNEA

  /* ===== CANTIDAD ===== */
  const qtyNumber = safe("qty-number");

  safe("qty-minus")?.addEventListener("click", () => {
    const n = parseInt(qtyNumber.textContent);
    if (n > 1) qtyNumber.textContent = n - 1;
  });

  safe("qty-plus")?.addEventListener("click", () => {
    qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
  });

  /* ===== ADD TO CART ===== */
  safe("product-add")?.addEventListener("click", () => {
    const qty   = parseInt(qtyNumber.textContent) || 1;
    const name  = safe("product-name").textContent.trim();
    const img   = safe("product-image").src;
    const price = parseFloat(
      safe("product-price").textContent.replace(/[^\d.-]/g, "")
    );

    const productId = safe("product-add").dataset.id;
    if (!productId) return;

    addToCart({ product_id: productId, name, price, img, qty });
    qtyNumber.textContent = "1";
  });

  loadSimilarProducts();
});
