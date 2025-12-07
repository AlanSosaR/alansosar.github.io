/* ============================================================
   MAIN.JS — Café Cortero
   VERSIÓN OFICIAL 100% CORREGIDA
============================================================ */

/* ===================== FUNCIÓN SAFE ===================== */
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

  /* ============================================================
     NUEVO MENÚ FLOTANTE (ESTILO CARRITO) + COMPATIBLE
     ============================================================ */

  const menuToggle    = safe("menu-toggle");      // botón hamburguesa (móvil)
  const legacyDrawer  = safe("drawer");          // drawer viejo (por si aún existe)
  const userDrawer    = safe("user-drawer");      // menú flotante nuevo
  const userScrim     = safe("user-scrim");       // fondo oscuro
  const btnHeaderUser = safe("btn-header-user");  // avatar del header (PC/móvil)

  function toggleUserDrawer(forceOpen) {
    if (!userDrawer || !userScrim) return;

    const isOpen = userDrawer.classList.contains("open");
    const shouldOpen =
      typeof forceOpen === "boolean" ? forceOpen : !isOpen;

    if (shouldOpen) {
      userDrawer.classList.add("open");
      userScrim.classList.add("open");
    } else {
      userDrawer.classList.remove("open");
      userScrim.classList.remove("open");
    }
  }

  // Click en avatar → abre/cierra menú flotante
  if (btnHeaderUser && userDrawer && userScrim) {
    btnHeaderUser.addEventListener("click", () => {
      toggleUserDrawer();
    });
  }

  // En móvil: el botón hamburguesa usa el NUEVO menú si existe,
  // y si no, sigue usando el drawer viejo.
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (userDrawer && userScrim) {
        toggleUserDrawer();
      } else if (legacyDrawer) {
        legacyDrawer.classList.toggle("open");
      }
    });
  }

  // Cerrar menú flotante al tocar el scrim
  if (userScrim && userDrawer) {
    userScrim.addEventListener("click", () => toggleUserDrawer(false));
  }

  // Cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleUserDrawer(false);
      if (legacyDrawer && legacyDrawer.classList.contains("open")) {
        legacyDrawer.classList.remove("open");
      }
    }
  });

  // Cerrar drawer viejo al hacer clic en sus links (si todavía lo usas)
  if (legacyDrawer) {
    document.querySelectorAll(".drawer-links a").forEach((link) => {
      link.addEventListener("click", () => legacyDrawer.classList.remove("open"));
    });
  }

  /* ============================================================
     FIX: Cerrar menús al cambiar tamaño de pantalla
     ============================================================ */
  window.addEventListener("resize", () => {
    if (legacyDrawer && legacyDrawer.classList.contains("open")) {
      legacyDrawer.classList.remove("open");
    }
    if (userDrawer && userDrawer.classList.contains("open")) {
      toggleUserDrawer(false);
    }
  });

  /* ===================== HERO CAROUSEL ===================== */

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

  /* ===================== CARRITO (BOTÓN HEADER) ===================== */

  const cartBtn = safe("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  }
  updateCartCount();

  /* ===================== SELECTOR DE CANTIDAD ===================== */

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

  /* ===================== PRODUCTO PRINCIPAL ===================== */

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

  /* ===================== CARROUSEL PRODUCTOS SIMILARES ===================== */

  const cards = document.querySelectorAll(".similar-card");

  if (cards.length > 0) {
    cards.forEach((card) => {
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, ""));
      const img = card.dataset.img;

      card.addEventListener("click", () => {
        cards.forEach((c) => c.classList.remove("active-card"));
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
          const offset =
            sec.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top: offset, behavior: "smooth" });
        }
      });
    });
  }

  /* ===================== CARRUSEL HORIZONTAL ===================== */

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

  /* ===================== FAB ===================== */

  const fabMain = safe("fab-main");
  const fabContainer = safe("fab");

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
