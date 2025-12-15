/* ============================================================
   MAIN.JS — Café Cortero 2025
   UI + CARRITO + INTERACCIONES
   ✔ Drawer funcional móvil / desktop
   ✔ Invitado / Logueado por clases
   ❌ SIN control de sesión aquí
   ✅ Logout conectado al core de Supabase
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

function updateCartCount() {
  const total = getCart().reduce((acc, item) => acc + item.qty, 0);
  const badge = safe("cart-count");
  if (badge) badge.textContent = total;
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
  const index = cart.findIndex(p => p.name === product.name);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  updateCartCount();
  animateCartBadge();
}

/* ========================= SIMILARES ========================= */
function loadSimilarProducts() {
  const productos = [
    { img: 'imagenes/bolsa_1.png', nombre: 'Café Cortero 250g', precio: 'L 180' },
    { img: 'imagenes/bolsa_2.png', nombre: 'Café Cortero 500g', precio: 'L 320' },
    { img: 'imagenes/bolsa_1.png', nombre: 'Café Cortero 1lb',  precio: 'L 550' },
    { img: 'imagenes/bolsa_2.png', nombre: 'Café Regalo',        precio: 'L 260' },
    { img: 'imagenes/bolsa_1.png', nombre: 'Café Premium',       precio: 'L 480' },
    { img: 'imagenes/bolsa_2.png', nombre: 'Café Tradicional',   precio: 'L 150' }
  ];

  const cont = safe("lista-similares");
  if (!cont) return;

  cont.innerHTML = productos.map(p => `
    <div class="similar-card"
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
   EVENTO PRINCIPAL
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ========================= DRAWER ========================= */
  const drawer     = safe("user-drawer");
  const scrim      = safe("user-scrim");
  const menuToggle = safe("menu-toggle");

  if (drawer) {
    drawer.classList.remove("logged");
    drawer.classList.add("no-user");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function openDrawer() {
    if (!drawer || !scrim) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.classList.add("open");
  }

  function closeDrawer() {
    if (!drawer || !scrim) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.classList.remove("open");
  }

  if (menuToggle && drawer) {
    menuToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    });
  }

  const avatarBtn = safe("btn-header-user");
  if (avatarBtn && drawer) {
    avatarBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    });
  }

  if (scrim) scrim.addEventListener("click", closeDrawer);
  if (drawer) drawer.addEventListener("click", e => e.stopPropagation());

  /* ========================= HERO CAROUSEL ========================= */
  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  if (heroImgs.length > 0) {
    heroImgs[0].classList.add("active");
    setInterval(() => {
      heroImgs.forEach(img => img.classList.remove("active"));
      heroIndex = (heroIndex + 1) % heroImgs.length;
      heroImgs[heroIndex].classList.add("active");
    }, 8000);
  }

  /* ========================= CARRITO ========================= */
  const cartBtn = safe("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  }
  updateCartCount();

  /* ========================= SIMILARES INIT ========================= */
  loadSimilarProducts();
  bindSimilarCardEvents();
  initSimilarCarousel();

});

/* =========================
   SIMILARES — SELECCIÓN DE TARJETA
========================= */
function bindSimilarCardEvents() {
  const cards = document.querySelectorAll(".similar-card");
  const productSection = document.querySelector(".product-main");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("active-card"));
      card.classList.add("active-card");

      safe("product-name").textContent = card.dataset.name;
      safe("product-image").src = card.dataset.img;
      document.querySelector(".price-part").textContent = card.dataset.price;
      safe("qty-number").textContent = "1";

      productSection?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  });
}

/* =========================
   SIMILARES — CARRUSEL + DOTS (FLECHAS + DOTS CLICABLES)
========================= */
function initSimilarCarousel() {
  const list = safe("lista-similares");
  const prev = safe("similar-prev");
  const next = safe("similar-next");
  const dots = document.querySelectorAll(".carousel-dots .dot");

  if (!list || !prev || !next || dots.length === 0) return;

  const card = list.querySelector(".similar-card");
  if (!card) return;

  const style = getComputedStyle(list);
  const gap = parseInt(style.gap || style.columnGap || 16);
  const CARD_WIDTH = card.offsetWidth + gap;

  let index = 0;
  const maxIndex = dots.length - 1;

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }

  function scrollToIndex() {
    list.scrollTo({
      left: CARD_WIDTH * index,
      behavior: "smooth"
    });
    updateDots();
  }

  /* Flechas */
  prev.addEventListener("click", () => {
    if (index > 0) {
      index--;
      scrollToIndex();
    }
  });

  next.addEventListener("click", () => {
    if (index < maxIndex) {
      index++;
      scrollToIndex();
    }
  });

  /* Dots clicables */
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      index = i;
      scrollToIndex();
    });
  });
}
