/* ============================================================
   MAIN.JS — Café Cortero 2025
   UI + CARRITO + INTERACCIONES
   ❌ SIN CONTROL DE SESIÓN AQUÍ
============================================================ */

/* ========================= SAFE ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= CARRITO ========================= */

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
  const index = cart.findIndex(p => p.name === product.name);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  updateCartCount();
  animateCartBadge();
}

/* ============================================================
   EVENTO PRINCIPAL
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ========================= DRAWER ========================= */
  const drawer     = safe("user-drawer");
  const scrim      = safe("user-scrim");
  const menuToggle = safe("menu-toggle");

  function openDrawer() {
    drawer?.classList.add("open");
    scrim?.classList.add("open");
  }

  function closeDrawer() {
    drawer?.classList.remove("open");
    scrim?.classList.remove("open");
  }

  // Toggle hamburguesa (ABRE y CIERRA)
if (menuToggle) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!drawer) return;
    drawer.classList.contains("open") ? closeDrawer() : openDrawer();
  });
}

  // Click en scrim cierra
  if (scrim) {
    scrim.addEventListener("click", closeDrawer);
  }

  // Cerrar drawer al cambiar tamaño (fix responsive)
  window.addEventListener("resize", () => {
    if (drawer?.classList.contains("open")) {
      closeDrawer();
    }
  });

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

  /* ========================= SELECTOR CANTIDAD ========================= */
  const qtyNumber = safe("qty-number");
  const qtyMinus  = safe("qty-minus");
  const qtyPlus   = safe("qty-plus");

  if (qtyMinus && qtyNumber) {
    qtyMinus.addEventListener("click", () => {
      const n = parseInt(qtyNumber.textContent);
      if (n > 1) qtyNumber.textContent = n - 1;
    });
  }

  if (qtyPlus && qtyNumber) {
    qtyPlus.addEventListener("click", () => {
      qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
    });
  }

  /* ========================= AGREGAR AL CARRITO ========================= */
  const btnMain = safe("product-add");

  if (btnMain && qtyNumber) {
    btnMain.addEventListener("click", () => {
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
  }

  /* ========================= FAB WHATSAPP ========================= */
  const fabMain = safe("fab-main");
  const fabContainer = safe("fab");

  if (fabMain && fabContainer) {
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

});
