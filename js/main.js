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

  const cont = document.getElementById("lista-similares");
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

  /* Estado base (INVITADO por defecto) */
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

  /* Botón hamburguesa */
  if (menuToggle && drawer) {
    menuToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    });
  }

  /* Avatar abre / cierra drawer */
  const avatarBtn = safe("btn-header-user");
  if (avatarBtn && drawer) {
    avatarBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    });
  }

  /* Click en scrim cierra */
  if (scrim) {
    scrim.addEventListener("click", closeDrawer);
  }

  /* Evita cierres al tocar dentro del drawer */
  if (drawer) {
    drawer.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  /* Cierra drawer al cambiar tamaño */
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
      if (
        !fabContainer.contains(e.target) &&
        !drawer.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        fabContainer.classList.remove("active");
      }
    });
  }

  /* ========================= LOGOUT DESDE MENÚ ========================= */
  const logoutBtn = safe("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (typeof window.corteroLogout === "function") {
        console.log("🚪 Logout desde menú");
        window.corteroLogout();
      } else {
        console.error("❌ corteroLogout no está disponible");
      }
    });
  }

  /* ========================= SIMILARES INIT ========================= */
  loadSimilarProducts();

});
