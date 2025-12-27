/* ============================================================
   MAIN.JS — Café Cortero 2025 (FIX DEFINITIVO)
   UI + CARRITO + INTERACCIONES
   ❌ NO toca cart-count directamente
   ✅ Header es dueño del contador
============================================================ */

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

/* 🔑 SINCRONIZAR CONTADOR CON HEADER */
function syncHeaderCounter() {
  if (typeof window.updateHeaderCartCount === "function") {
    window.updateHeaderCartCount();
  }
}

/* Animación visual del badge (permitido) */
function animateCartBadge() {
  const badge = safe("cart-count");
  if (!badge) return;
  badge.classList.remove("animate");
  void badge.offsetWidth;
  badge.classList.add("animate");
}

/* ============================================================
   ADD TO CART — FIX REAL
============================================================ */
function addToCart(product) {
  const cart = getCart();

  const index = cart.findIndex(
    p => p.product_id === product.product_id
  );

  if (index >= 0) {
    cart[index].qty += product.qty;
  } else {
    cart.push({
      product_id: product.product_id, // 🔑 CLAVE ÚNICA
      name: product.name,
      price: product.price,
      img: product.img,
      qty: product.qty
    });
  }

  saveCart(cart);

  // 🔑 SOLO sincronizar, NO modificar badge directo
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

  cont.innerHTML = productos.map(p => `
    <div class="similar-card"
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

/* ============================================================
   DOM READY
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // 🔑 Cuando el header ya exista, sincronizar contador
  syncHeaderCounter();

  /* ========================= CANTIDAD ========================= */
  const qtyNumber = safe("qty-number");
  const qtyMinus  = safe("qty-minus");
  const qtyPlus   = safe("qty-plus");

  qtyMinus?.addEventListener("click", () => {
    const n = parseInt(qtyNumber.textContent);
    if (n > 1) qtyNumber.textContent = n - 1;
  });

  qtyPlus?.addEventListener("click", () => {
    qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
  });

  /* ========================= AGREGAR AL CARRITO ========================= */
  safe("product-add")?.addEventListener("click", () => {
    const qty   = parseInt(qtyNumber.textContent) || 1;
    const name  = safe("product-name").textContent.trim();
    const img   = safe("product-image").src;
    const price = parseFloat(
      document.querySelector(".price-part")
        .textContent.replace(/[^\d.-]/g, "")
    );

    const productId = safe("product-add").dataset.id;
    if (!productId) {
      alert("Producto no válido. Recarga la página.");
      return;
    }

    addToCart({
      product_id: productId,
      name,
      price,
      img,
      qty
    });

    qtyNumber.textContent = "1";
  });

  /* ========================= SIMILARES ========================= */
  loadSimilarProducts();
  bindSimilarCardEvents();
  initSimilarCarousel();
});

/* ========================= SIMILARES ========================= */
function bindSimilarCardEvents() {
  document.querySelectorAll(".similar-card").forEach(card => {
    card.addEventListener("click", () => {
      safe("product-name").textContent = card.dataset.name;
      safe("product-image").src = card.dataset.img;
      document.querySelector(".price-part").textContent = card.dataset.price;
      safe("product-add").dataset.id = card.dataset.id; // 🔑
      safe("qty-number").textContent = "1";
    });
  });
}

/* ========================= CARRUSEL ========================= */
function initSimilarCarousel() {
  const list = safe("lista-similares");
  const prev = safe("similar-prev");
  const next = safe("similar-next");
  const dots = document.querySelectorAll(".carousel-dots .dot");

  if (!list || !prev || !next || !dots.length) return;

  const card = list.querySelector(".similar-card");
  if (!card) return;

  const gap = parseInt(getComputedStyle(list).gap || 16);
  const CARD_WIDTH = card.offsetWidth + gap;

  let index = 0;

  function updateUI() {
    list.scrollTo({ left: CARD_WIDTH * index, behavior: "smooth" });
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
    prev.disabled = index === 0;
    next.disabled = index === dots.length - 1;
  }

  prev.onclick = () => index > 0 && (--index, updateUI());
  next.onclick = () => index < dots.length - 1 && (++index, updateUI());
  dots.forEach((dot, i) => dot.onclick = () => (index = i, updateUI()));

  updateUI();
}
