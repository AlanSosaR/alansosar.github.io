/* ============================================================
   MAIN.JS — Café Cortero 2025 (FINAL ESTABLE)
   UI + CARRITO + INTERACCIONES
   ✅ Header controla contador
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

/* ========================= SIMILARES (DESDE BD) ========================= */
async function loadSimilarProducts() {
  const cont = safe("lista-similares");
  if (!cont) return;

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .eq("carousel", true)
    .eq("status", "activo")
    .order("created_at", { ascending: false });

  /* ❌ Error al consultar */
  if (error) {
    console.error("❌ Error cargando productos del carrusel:", error);
    showEmptyCatalog();
    return;
  }

  /* ☕ No hay productos en carrusel */
  if (!data || !data.length) {
    cont.innerHTML = "";
    showEmptyCatalog();
    return;
  }

  /* ✅ Hay productos */
  hideEmptyCatalog();

  cont.innerHTML = data.map(p => `
    <div class="similar-card"
         data-id="${p.id}"
         data-name="${p.name}"
         data-price="L ${p.price}"
         data-img="${p.image_url || "imagenes/no-image.png"}">
         
      <img
        src="${p.image_url || "imagenes/no-image.png"}"
        alt="${p.name}"
        onerror="this.src='imagenes/no-image.png'"
      >

      <h4>${p.name}</h4>
      <div class="price-sm">L ${p.price}</div>
    </div>
  `).join("");
}

/* ========================= CARRUSEL — ESTADO ÚNICO ========================= */
let similarIndex = 0;
const setSimilarIndex = i => similarIndex = i;
const getSimilarIndex = () => similarIndex;

/* ========================= HERO CAROUSEL (ARRIBA) ========================= */
function initHeroCarousel() {
  const carousel = document.querySelector(".hero-carousel");
  if (!carousel) return;

  const slides = carousel.querySelectorAll("img");
  if (!slides.length) return;

  let index = 0;

  slides.forEach((img, i) => {
    img.style.opacity = i === 0 ? "1" : "0";
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.transition = "opacity 0.6s ease";
  });

  setInterval(() => {
    slides[index].style.opacity = "0";
    index = (index + 1) % slides.length;
    slides[index].style.opacity = "1";
  }, 3500);
}

/* ========================= INIT PRODUCTO DEFAULT ========================= */
function initDefaultProduct() {
  const firstCard = document.querySelector(".similar-card");
  if (!firstCard) return;

  // 🔑 Datos base
  const name  = firstCard.dataset.name;
  const img   = firstCard.dataset.img || "imagenes/no-image.png";
  const price = firstCard.dataset.price;
  const id    = firstCard.dataset.id;

  // 🔹 Título
  safe("product-name").textContent = name;

  // 🔹 Imagen
  const imageEl = safe("product-image");
  imageEl.src = img;
  imageEl.onerror = () => {
    imageEl.src = "imagenes/no-image.png";
  };

  // 🔹 Precio
  const priceEl = document.querySelector(".price-part");
  if (priceEl) priceEl.textContent = price;

  // 🔹 Botón carrito (UUID real)
  const addBtn = safe("product-add");
  if (addBtn) addBtn.dataset.id = id;

  // 🔹 Cantidad
  safe("qty-number").textContent = "1";

  // 🔹 Estado visual
  document.querySelectorAll(".similar-card")
    .forEach(c => c.classList.remove("active-card"));
  firstCard.classList.add("active-card");

  // 🔹 Índice carrusel
  setSimilarIndex(0);
}

/* ========================= DOM READY ========================= */
document.addEventListener("DOMContentLoaded", () => {

  syncHeaderCounter();

  /* ========================= FAB ========================= */
  const fabContainer = safe("fab");
  const fabMain = safe("fab-main");

  fabMain?.addEventListener("click", e => {
    e.stopPropagation();
    fabContainer.classList.toggle("active");
  });

  document.addEventListener("click", e => {
    if (fabContainer && !fabContainer.contains(e.target)) {
      fabContainer.classList.remove("active");
    }
  });

/* ========================= CANTIDAD ========================= */
const qtyNumber = safe("qty-number");

safe("qty-minus")?.addEventListener("click", () => {
  const n = parseInt(qtyNumber.textContent, 10);
  if (n > 1) qtyNumber.textContent = n - 1;
});

safe("qty-plus")?.addEventListener("click", () => {
  const n = parseInt(qtyNumber.textContent, 10);
  const maxStock = Number(safe("product-add")?.dataset.stock || 99);

  if (n < maxStock) {
    qtyNumber.textContent = n + 1;
  }
});

/* ========================= ADD TO CART ========================= */
safe("product-add")?.addEventListener("click", () => {
  const qty = parseInt(qtyNumber.textContent, 10) || 1;

  const productId = safe("product-add").dataset.id;   // 🔑 ID real BD
  const name      = safe("product-name").textContent.trim();
  const img       = safe("product-image").src;

  const priceText = document.querySelector(".price-part")?.textContent || "";
  const price     = Number(priceText.replace(/[^\d.]/g, ""));

  if (!productId) {
    safeSnackbar("Producto no válido", "error");
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

  /* ===== ORDEN CORRECTO DE INICIALIZACIÓN ===== */
  initHeroCarousel();        // 🔑 HERO ARRIBA
  loadSimilarProducts();
  bindSimilarCardEvents();
  initDefaultProduct();      // 🔑 PRODUCTO PRINCIPAL
  initSimilarCarousel();
});

/* ========================= SIMILAR EVENTS ========================= */
function bindSimilarCardEvents() {
  const cards = document.querySelectorAll(".similar-card");
  const productSection = document.querySelector(".product-main");

  cards.forEach((card, idx) => {

    // Evita drag fantasma en móvil / desktop
    card.addEventListener("mousedown", e => e.preventDefault());

    card.addEventListener("click", () => {

      // 🔑 Estado carrusel
      setSimilarIndex(idx);

      cards.forEach(c => c.classList.remove("active-card"));
      card.classList.add("active-card");

      // 🔑 Imagen principal
      const img = safe("product-image");
      img.classList.remove("swap");
      void img.offsetWidth; // reflow
      img.classList.add("swap");

      img.src = card.dataset.img || "imagenes/no-image.png";
      img.onerror = () => {
        img.src = "imagenes/no-image.png";
      };

      // 🔑 Título
      safe("product-name").textContent = card.dataset.name || "Producto";

      // 🔑 Precio
      const priceEl = document.querySelector(".price-part");
      if (priceEl) priceEl.textContent = card.dataset.price || "—";

      // 🔑 Botón carrito (UUID real desde BD)
      const addBtn = safe("product-add");
      if (addBtn) addBtn.dataset.id = card.dataset.id;

      // 🔑 Cantidad
      safe("qty-number").textContent = "1";

      // 🔑 Scroll suave al producto principal
      if (productSection) {
        const y =
          productSection.getBoundingClientRect().top +
          window.scrollY - 20;

        window.scrollTo({
          top: y,
          behavior: "smooth"
        });
      }

      updateSimilarUI();
    });
  });
}

/* ========================= CARRUSEL SIMILARES ========================= */
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

/* ========================= ACTUALIZAR UI SIMILARES ========================= */
function updateSimilarUI() {
  const list = safe("lista-similares");
  const dots = document.querySelectorAll(".carousel-dots .dot");
  if (!list) return;

  const cards = list.querySelectorAll(".similar-card");
  if (!cards.length) return;

  // 🔑 Clamp índice (seguridad)
  const maxIndex = cards.length - 1;
  if (getSimilarIndex() > maxIndex) {
    setSimilarIndex(maxIndex);
  }

  const card = cards[0];
  const gap = parseInt(getComputedStyle(list).gap || 16, 10);
  const CARD_WIDTH = card.offsetWidth + gap;

  list.scrollTo({
    left: CARD_WIDTH * getSimilarIndex(),
    behavior: "smooth"
  });

  // 🔑 Dots (solo los necesarios)
  dots.forEach((d, i) => {
    d.classList.toggle("active", i === getSimilarIndex());
    d.style.display = i <= maxIndex ? "inline-block" : "none";
  });

  // 🔑 Tarjeta activa
  cards.forEach((c, i) =>
    c.classList.toggle("active-card", i === getSimilarIndex())
  );
}
