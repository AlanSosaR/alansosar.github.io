/* ============================================================
   MAIN.JS — Café Cortero 2025
   UI + CARRITO + INTERACCIONES
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

  /* =====================================================
     HEADER — SOLO SI NO ESTÁ MIGRADO
  ===================================================== */
  const HEADER_MANAGED_EXTERNALLY = typeof initHeader === "function";

  if (!HEADER_MANAGED_EXTERNALLY) {

    const drawer     = safe("user-drawer");
    const scrim      = safe("user-scrim");
    const menuToggle = safe("menu-toggle");

    function openDrawer() {
      drawer?.classList.add("open");
      scrim?.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
      drawer?.classList.remove("open");
      scrim?.classList.remove("open");
      document.body.style.overflow = "";
    }

    menuToggle?.addEventListener("click", e => {
      e.preventDefault();
      drawer?.classList.contains("open") ? closeDrawer() : openDrawer();
    });

    scrim?.addEventListener("click", closeDrawer);

    document.addEventListener("click", (e) => {
      const avatarBtn = e.target.closest("#btn-header-user");
      if (!avatarBtn) return;
      e.preventDefault();
      e.stopPropagation();
      openDrawer();
    });
  }

  /* ========================= HERO ========================= */
  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  if (heroImgs.length) {
    heroImgs[0].classList.add("active");
    setInterval(() => {
      heroImgs.forEach(i => i.classList.remove("active"));
      heroIndex = (heroIndex + 1) % heroImgs.length;
      heroImgs[heroIndex].classList.add("active");
    }, 8000);
  }

  /* ========================= CARRITO ========================= */
  safe("cart-btn")?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });
  updateCartCount();

  /* ========================= FAB ========================= */
  const fabContainer = safe("fab");
  const fabMain = safe("fab-main");

  if (fabContainer && fabMain) {
    fabMain.addEventListener("click", (e) => {
      e.stopPropagation();
      fabContainer.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!fabContainer.contains(e.target)) {
        fabContainer.classList.remove("active");
      }
    });
  }

  /* ========================= SELECTOR CANTIDAD ========================= */
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
  const btnAdd = safe("product-add");

  btnAdd?.addEventListener("click", () => {
    const nameEl  = safe("product-name");
    const imgEl   = safe("product-image");
    const priceEl = document.querySelector(".price-part");

    if (!nameEl || !imgEl || !priceEl) return;

    const qty   = parseInt(qtyNumber.textContent) || 1;
    const name  = nameEl.textContent.trim();
    const price = parseFloat(priceEl.textContent.replace(/[^\d.-]/g, ""));
    const img   = imgEl.src;

    addToCart({ name, price, img, qty });
    qtyNumber.textContent = "1";
  });

  /* ========================= SIMILARES ========================= */
  loadSimilarProducts();
  bindSimilarCardEvents();
  initSimilarCarousel();
});

/* ========================= SIMILARES ========================= */
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
  const maxIndex = dots.length - 1;

  function updateUI() {
    list.scrollTo({ left: CARD_WIDTH * index, behavior: "smooth" });
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
    prev.disabled = index === 0;
    next.disabled = index === maxIndex;
  }

  prev.addEventListener("click", () => {
    if (index > 0) { index--; updateUI(); }
  });

  next.addEventListener("click", () => {
    if (index < maxIndex) { index++; updateUI(); }
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      index = i;
      updateUI();
    });
  });

  updateUI();
}
