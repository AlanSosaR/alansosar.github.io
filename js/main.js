/* ============================================================
   MAIN.JS — Café Cortero
   VERSIÓN OFICIAL 100% CORREGIDA CON VALIDACIÓN SAFE()
   ============================================================ */

/* ===================== FUNCIÓN SAFE ===================== */
/* Evita errores cuando un elemento NO existe en la página */
function safe(id) {
  return document.getElementById(id);
}

/* ===================== CARRITO ===================== */

const CART_KEY = "cafecortero_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
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
  const index = cart.findIndex((p) => p.name === product.name);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  updateCartCount();
  animateCartBadge();
}

/* ===================== EVENTO PRINCIPAL ===================== */

document.addEventListener("DOMContentLoaded", () => {

  /* Drawer móvil */
  const menuToggle = safe("menu-toggle");
  const drawer = safe("drawer");

  if (menuToggle && drawer) {
    menuToggle.addEventListener("click", () => {
      drawer.classList.toggle("open");
    });

    document.querySelectorAll(".drawer-links a").forEach((link) => {
      link.addEventListener("click", () => drawer.classList.remove("open"));
    });
  }

  /* Hero carousel */
  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  const showHero = (i) => {
    heroImgs.forEach((img) => img.classList.remove("active"));
    if (heroImgs[i]) heroImgs[i].classList.add("active");
  };

  if (heroImgs.length > 0) {
    showHero(0);
    setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImgs.length;
      showHero(heroIndex);
    }, 8000);
  }

  /* Carrito */
  const cartBtn = safe("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  }
  updateCartCount();

  /* Selector de cantidad */
  const qtyNumber = safe("qty-number");
  const qtyMinus = safe("qty-minus");
  const qtyPlus = safe("qty-plus");

  if (qtyMinus && qtyNumber)
    qtyMinus.addEventListener("click", () => {
      let n = parseInt(qtyNumber.textContent);
      if (n > 1) qtyNumber.textContent = n - 1;
    });

  if (qtyPlus && qtyNumber)
    qtyPlus.addEventListener("click", () => {
      let n = parseInt(qtyNumber.textContent);
      qtyNumber.textContent = n + 1;
    });

  /* Producto principal */
  const btnMain = safe("product-add");

  if (btnMain && qtyNumber) {
    btnMain.addEventListener("click", () => {
      const nameEl = safe("product-name");
      const imgEl = safe("product-image");
      const priceEl = document.querySelector(".price-part");

      if (!nameEl || !imgEl || !priceEl) return;

      const qty = parseInt(qtyNumber.textContent) || 1;
      const name = nameEl.textContent.trim();
      const price = parseFloat(priceEl.textContent.replace(/[^\d.-]/g, ""));
      const img = imgEl.src;

      addToCart({ name, price, img, qty });
      qtyNumber.textContent = "1";
    });
  }

  /* Carrusel productos similares */
  const cards = document.querySelectorAll(".similar-card");

  if (cards.length > 0) {
    cards.forEach((card) => {
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, ""));
      const img = card.dataset.img;

      card.addEventListener("click", () => {
        document
          .querySelectorAll(".similar-card")
          .forEach((c) => c.classList.remove("active-card"));

        card.classList.add("active-card");

        const nameEl = safe("product-name");
        const priceEl = document.querySelector(".price-part");
        const imageEl = safe("product-image");

        if (!nameEl || !priceEl || !imageEl) return;

        nameEl.textContent = name;
        priceEl.textContent = `L ${price}`;

        imageEl.src = img;
        imageEl.style.opacity = "0";
        setTimeout(() => {
          imageEl.style.transition = "opacity 0.4s ease";
          imageEl.style.opacity = "1";
        }, 80);

        const sec = safe("productos");
        if (sec) {
          const offset = sec.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top: offset, behavior: "smooth" });
        }
      });
    });
  }

  /* Carrusel horizontal */
  const carousel = document.querySelector(".similar-list");
  const prevBtn = document.querySelector(".carousel-prev");
  const nextBtn = document.querySelector(".carousel-next");

  if (carousel && prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () =>
      carousel.scrollBy({ left: -220, behavior: "smooth" })
    );
    nextBtn.addEventListener("click", () =>
      carousel.scrollBy({ left: 220, behavior: "smooth" })
    );
  }

  /* FAB */
  const fabMain = safe("fab-main");
  const fabContainer = document.querySelector(".fab-container");

  if (fabMain && fabContainer) {
    fabMain.addEventListener("click", (e) => {
      e.stopPropagation();
      fabContainer.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!fabContainer.contains(e.target))
        fabContainer.classList.remove("active");
    });
  }
});
