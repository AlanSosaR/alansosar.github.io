/* ============================================================
   MAIN.JS — Café Cortero 2025 (FINAL DEFINITIVO)
   UI + CARRITO + CARRUSELES + SUPABASE
============================================================ */
let currentProduct = null;
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

/* 🔑 cantidad del producto en carrito */
function getQtyInCart(productId) {
  const cart = getCart();
  const item = cart.find(p => p.product_id === productId);
  return item ? Number(item.qty) : 0;
}

/* 🔑 estado visual de stock */
function getStockStatus(stockBD, qtyInCart) {
  const available = stockBD - qtyInCart;
  console.log(`📦 Stock BD: ${stockBD}, En Carrito: ${qtyInCart}, Disponible: ${available}`);

  if (available <= 0) {
    return { label: "No disponible", className: "out" };
  }
  if (available <= 5) {
    return { label: `Últimas ${available} bolsas`, className: "low" };
  }
  return { label: "Disponible", className: "available" };
}

/* 🔑 CONTROL DE BOTONES + / − / ADD */
function updateQtyControls(productId, stockBD) {
  const qtyEl = safe("qty-number");
  const btnPlus = safe("qty-plus");
  const btnMinus = safe("qty-minus");
  const addBtn = safe("product-add");

  if (!qtyEl || !btnPlus || !btnMinus || !addBtn) return;

  const qty = Number(qtyEl.textContent);
  const qtyInCart = getQtyInCart(productId);
  const available = stockBD - qtyInCart;

  // Bloqueo total si no hay nada
  if (available <= 0) {
    btnPlus.disabled = true;
    btnMinus.disabled = true;
    addBtn.disabled = true;
    return;
  }

  btnMinus.disabled = qty <= 1;

  // 🔑 Si el usuario intenta subir más allá de lo disponible
  if (qty >= available) {
    btnPlus.disabled = true;
  } else {
    btnPlus.disabled = false;
  }

  addBtn.disabled = qty > available;
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

  if (index >= 0) {
    cart[index].qty += product.qty;
  } else {
    cart.push(product);
  }

  saveCart(cart);

  // 🔑 NOTIFICA AL HEADER EN TIEMPO REAL
  window.dispatchEvent(new Event("cartUpdated"));

  animateCartBadge();
}

/* =========================
   RENDER PRODUCTO PRINCIPAL
========================= */
function renderMainProduct(product) {
  currentProduct = product; // 🔑 CLAVE (NO QUITAR)

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

  img.src = product.image_url || "/imagenes/no-image.png";
  img.onerror = () => img.src = "/imagenes/no-image.png";

  const addBtn = safe("product-add");
  addBtn.dataset.id = product.id;
  addBtn.dataset.stock = product.stock ?? 0;

  const stockBD = Number(product.stock ?? 0);
  const qtyInCart = getQtyInCart(product.id);

  const statusEl = safe("product-status");
  if (statusEl) {
    statusEl.classList.remove("available", "low", "out");
    const status = getStockStatus(stockBD, qtyInCart);
    console.log(`🔍 Cargando producto: ${product.name}, Stock: ${stockBD}, Status detectado: ${status.label}`);
    statusEl.textContent = status.label;
    statusEl.classList.add(status.className);
  }

  safe("qty-number").textContent = "1";
  updateQtyControls(product.id, stockBD);
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
      data-img="${p.image_url || "/imagenes/no-image.png"}"
      data-description="${p.description || ""}"
      data-category="${p.category || ""}"
      data-grind="${p.grind_type || ""}"
      data-presentation="${p.presentation || ""}"
      data-stock="${p.stock ?? 0}"
    >
      <img src="${p.image_url || "/imagenes/no-image.png"}"
           onerror="this.src='/imagenes/no-image.png'">
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

  requestAnimationFrame(() => {
    requestAnimationFrame(updateSimilarUI);
  });
}

function updateSimilarUI() {
  const list = safe("lista-similares");
  if (!list) return;

  const cards = list.querySelectorAll(".similar-card");
  const dots = document.querySelectorAll(".carousel-dots .dot");
  if (!cards.length) return;

  const rect = cards[0].getBoundingClientRect();
  if (rect.width === 0) return;

  const gap = parseInt(getComputedStyle(list).gap || 16, 10);
  const CARD_WIDTH = rect.width + gap;

  list.scrollTo({
    left: CARD_WIDTH * similarIndex,
    behavior: "smooth"
  });

  cards.forEach((c, i) =>
    c.classList.toggle("active-card", i === similarIndex)
  );

  dots.forEach((d, i) =>
    d.classList.toggle("active", i === similarIndex)
  );
}

function initHeroCarousel() {
  const images = Array.from(document.querySelectorAll(".hero-img"));
  const pills = Array.from(document.querySelectorAll(".pill-segment"));

  if (!images.length || !pills.length) return;

  const STATES = [
    [0, 1, 2],
    [3, 4, 5, 6, 7],
    [8, 9, 10, 11]
  ];

  let mode = "all";
  let stateIndex = 0;
  let globalIndex = 0;
  let localIndex = 0;
  let timer = null;

  const INTERVAL = 8000;

  function showImage(i) {
    images.forEach(img => img.classList.remove("active"));
    images[i]?.classList.add("active");
  }

  function syncPillsByImage(i) {
    pills.forEach(p => p.classList.remove("active"));
    if (i <= 2) pills[0].classList.add("active");
    else if (i <= 7) pills[1].classList.add("active");
    else pills[2].classList.add("active");
  }

  function next() {
    if (mode === "all") {
      globalIndex = (globalIndex + 1) % images.length;
      showImage(globalIndex);
      syncPillsByImage(globalIndex);
    } else {
      const group = STATES[stateIndex];
      localIndex = (localIndex + 1) % group.length;
      globalIndex = group[localIndex];
      showImage(globalIndex);
    }
  }

  function start() {
    stop();
    timer = setInterval(next, INTERVAL);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  pills.forEach((pill, i) => {
    pill.addEventListener("click", () => {
      mode = "state";
      stateIndex = i;
      localIndex = 0;
      globalIndex = STATES[i][0];

      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");

      showImage(globalIndex);
      start();
    });
  });

  // INIT REAL
  showImage(0);
  syncPillsByImage(0);
  start();
}

/* =========================
   FAB — BOTÓN FLOTANTE DE CONTACTO
========================= */
function initContactFAB() {
  const fab = document.getElementById("fab");
  const fabBtn = document.getElementById("fab-main");

  if (!fab || !fabBtn) return;

  // Click en botón principal
  fabBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // 🔑 CLAVE
    fab.classList.toggle("open");
  });

  // Evita cerrar al interactuar dentro del FAB
  fab.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Click fuera → cerrar
  document.addEventListener("click", () => {
    fab.classList.remove("open");
  });
}

/* =========================
   DOM READY (ÚNICO Y CORRECTO)
========================= */
document.addEventListener("DOMContentLoaded", () => {

  syncHeaderCounter();
  initHeroCarousel();
  initContactFAB();

  const qtyNumber = safe("qty-number");

  /* ===== BOTÓN MENOS ===== */
  safe("qty-minus")?.addEventListener("click", () => {
    const n = parseInt(qtyNumber.textContent, 10);
    if (n > 1) qtyNumber.textContent = n - 1;

    updateQtyControls(
      safe("product-add").dataset.id,
      Number(safe("product-add").dataset.stock)
    );
  });

  /* ===== BOTÓN MÁS ===== */
  safe("qty-plus")?.addEventListener("click", () => {
    qtyNumber.textContent = parseInt(qtyNumber.textContent, 10) + 1;

    updateQtyControls(
      safe("product-add").dataset.id,
      Number(safe("product-add").dataset.stock)
    );
  });

  /* ===== ADD TO CART (VALIDADO) ===== */
  safe("product-add")?.addEventListener("click", () => {
    const qty = parseInt(qtyNumber.textContent, 10) || 1;

    const productId = safe("product-add").dataset.id;
    const stockBD = Number(safe("product-add").dataset.stock ?? 0);
    const qtyInCart = getQtyInCart(productId);
    const available = stockBD - qtyInCart;

    if (available <= 0 || qty > available) {
      showSnack(
        available <= 0
          ? "Este café no tiene disponibilidad actualmente."
          : `Solo quedan ${available} bolsas disponibles.`
      );
      return;
    }

    addToCart({
      product_id: productId,
      name: currentProduct.name,
      price: currentProduct.price,
      img: currentProduct.image_url,
      qty
    });

    qtyNumber.textContent = "1";
    updateQtyControls(productId, stockBD);

    const statusEl = safe("product-status");
    if (statusEl) {
      const newQtyInCart = getQtyInCart(productId);
      const status = getStockStatus(stockBD, newQtyInCart);
      statusEl.classList.remove("available", "low", "out");
      statusEl.textContent = status.label;
      statusEl.classList.add(status.className);
    }
  });

  /* ===== CARGA INICIAL ===== */
  loadSimilarProducts();

});

