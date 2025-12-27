/* ============================================================
   MAIN.JS — Café Cortero 2025 (FINAL ESTABLE)
   UI + CARRITO + INTERACCIONES
   ✅ Header es dueño del contador
============================================================ */

/* ========================= SAFE ========================= */
function safe(id) {
  return document.getElementById(id);
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

/* 🔑 HEADER CONTROLA EL BADGE */
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

  if (index >= 0) {
    cart[index].qty += product.qty;
  } else {
    cart.push(product);
  }

  saveCart(cart);
  syncHeaderCounter();
  animateCartBadge();
}

/* ========================= SIMILARES ========================= */

function loadSimilarProducts() {
  const productos = [
    { id: "250g", nombre: "Café Cortero 250g", precio: "L 180", img: "imagenes/bolsa_1.png" },
    { id: "500g", nombre: "Café Cortero 500g", precio: "L 320", img: "imagenes/bolsa_2.png" },
    { id: "1lb",  nombre: "Café Cortero 1lb",  precio: "L 550", img: "imagenes/bolsa_1.png" },
    { id: "gift", nombre: "Café Regalo",        precio: "L 260", img: "imagenes/bolsa_2.png" },
    { id: "prem", nombre: "Café Premium",       precio: "L 480", img: "imagenes/bolsa_1.png" },
    { id: "trad", nombre: "Café Tradicional",   precio: "L 150", img: "imagenes/bolsa_2.png" }
  ];

  const cont = safe("lista-similares");
  if (!cont) return;

  cont.innerHTML = productos.map((p, i) => `
    <div class="similar-card ${i === 0 ? "active" : ""}"
         data-id="${p.id}"
         data-name="${p.nombre}"
         data-price="${p.precio}"
         data-img="${p.img}">
      <img src="${p.img}" alt="${p.nombre}">
      <h4>${p.nombre}</h4>
      <div class="price-sm">${p.precio}</div>
    </div>
  `).join("");
}

/* ========================= CARRUSEL ESTADO ÚNICO ========================= */

let similarIndex = 0;

function setSimilarIndex(i) {
  similarIndex = i;
}

function getSimilarIndex() {
  return similarIndex;
}

/* ========================= DOM READY ========================= */

document.addEventListener("DOMContentLoaded", () => {

  syncHeaderCounter();

  /* ========================= FAB ========================= */
  const fab = document.querySelector(".fab");
  const fabMenu = document.querySelector(".fab-menu");

  fab?.addEventListener("click", (e) => {
    e.stopPropagation();
    fab.classList.toggle("open");
    fabMenu?.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (fab && !fab.contains(e.target)) {
      fab.classList.remove("open");
      fabMenu?.classList.remove("open");
    }
  });

  /* ========================= CANTIDAD ========================= */
  const qtyNumber = safe("qty-number");
  safe("qty-minus")?.addEventListener("click", () => {
    const n = parseInt(qtyNumber.textContent);
    if (n > 1) qtyNumber.textContent = n - 1;
  });

  safe("qty-plus")?.addEventListener("click", () => {
    qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
  });

  /* ========================= ADD TO CART ========================= */
  safe("product-add")?.addEventListener("click", () => {
    const qty   = parseInt(qtyNumber.textContent) || 1;
    const name  = safe("product-name").textContent.trim();
    const img   = safe("product-image").src;
    const price = parseFloat(
      document.querySelector(".price-part").textContent.replace(/[^\d.-]/g, "")
    );

    const productId = safe("product-add").dataset.id;
    if (!productId) return alert("Producto no válido");

    addToCart({ product_id: productId, name, price, img, qty });
    qtyNumber.textContent = "1";
  });

  loadSimilarProducts();
  bindSimilarCardEvents();
  initSimilarCarousel();
});

/* ========================= SIMILAR EVENTS ========================= */

function bindSimilarCardEvents() {
  document.querySelectorAll(".similar-card").forEach((card, idx) => {

    /* 🔑 evita salto vertical */
    card.addEventListener("mousedown", e => e.preventDefault());

    card.addEventListener("click", () => {

      /* producto principal sin reflow */
      const img = safe("product-image");
      const h = img.offsetHeight;
      img.style.height = h + "px";

      img.classList.remove("swap");
      void img.offsetWidth;
      img.classList.add("swap");

      safe("product-name").textContent = card.dataset.name;
      img.src = card.dataset.img;
      document.querySelector(".price-part").textContent = card.dataset.price;
      safe("product-add").dataset.id = card.dataset.id;
      safe("qty-number").textContent = "1";

      setTimeout(() => img.style.height = "", 300);

      setSimilarIndex(idx);
      updateSimilarUI();
    });
  });
}

/* ========================= CARRUSEL ========================= */

function initSimilarCarousel() {
  const prev = safe("similar-prev");
  const next = safe("similar-next");
  const dots = document.querySelectorAll(".carousel-dots .dot");

  prev && (prev.onclick = () => {
    if (getSimilarIndex() > 0) {
      setSimilarIndex(getSimilarIndex() - 1);
      updateSimilarUI();
    }
  });

  next && (next.onclick = () => {
    if (getSimilarIndex() < dots.length - 1) {
      setSimilarIndex(getSimilarIndex() + 1);
      updateSimilarUI();
    }
  });

  dots.forEach((dot, i) => {
    dot.onclick = () => {
      setSimilarIndex(i);
      updateSimilarUI();
    };
  });

  updateSimilarUI();
}

function updateSimilarUI() {
  const list = safe("lista-similares");
  const dots = document.querySelectorAll(".carousel-dots .dot");
  if (!list) return;

  const card = list.querySelector(".similar-card");
  if (!card) return;

  const gap = parseInt(getComputedStyle(list).gap || 16);
  const CARD_WIDTH = card.offsetWidth + gap;

  list.scrollTo({
    left: CARD_WIDTH * getSimilarIndex(),
    behavior: "smooth"
  });

  dots.forEach((d, i) =>
    d.classList.toggle("active", i === getSimilarIndex())
  );

  document.querySelectorAll(".similar-card")
    .forEach((c, i) =>
      c.classList.toggle("active", i === getSimilarIndex())
    );
}
