/* ============================================================
   MAIN.JS — Café Cortero 2025 (FINAL DEFINITIVO)
   UI + CARRITO + CARRUSELES + SUPABASE
============================================================ */
let currentProduct = null;
let lastOrderDate = null; // 🔑 Fecha del último pedido
/* ========================= SAFE ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= NOTIFICACIONES ========================= */
function showSnack(msg, duration = 3000) {
  const snack = safe("snackbar");
  if (!snack) return;
  snack.textContent = msg;
  snack.classList.add("show");
  setTimeout(() => snack.classList.remove("show"), duration);
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

/* ========================= CARRITO = :root ========================= */
const CART_KEY = "cafecortero_cart";
const FAV_KEY = "cafecortero_favs";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function isFavorite(productId) {
  return getFavorites().includes(productId);
}

function toggleFavorite(productId) {
  let favs = getFavorites();

  // Si ya es favorito, lo quitamos.
  // Si no lo es, reemplazamos lo que haya por este nuevo (Single Favorite)
  if (favs.includes(productId)) {
    favs = [];
  } else {
    favs = [productId];
  }

  saveFavorites(favs);
  loadSimilarProducts(); // Recargar para reordenar
}

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
  // Si hay más de 5, no mostrar texto de estado para diseño más limpio
  return { label: "", className: "available" };
}

/* 🔑 Lógica de Descuento (Primera Compra / Nueva Promoción) */
async function checkUserLastOrder() {
  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();
  if (!sb || !user) {
    lastOrderDate = null;
    return;
  }

  try {
    const { data, error } = await sb
      .from("orders")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      lastOrderDate = new Date(data[0].created_at);
    } else {
      lastOrderDate = null; // Primerizo
    }

    // 🔑 Aviso informativo si ya compró (una vez por sesión)
    if (lastOrderDate && !sessionStorage.getItem("cortero_discount_notice")) {
      setTimeout(() => {
        showSnack("Los descuentos de bienvenida ya fueron aplicados en tu primer pedido. ¡Sigue atento a nuevas promociones!");
        sessionStorage.setItem("cortero_discount_notice", "true");
      }, 2000);
    }
    console.log("📅 Fecha último pedido establecida:", lastOrderDate);
  } catch (e) {
    console.warn("⚠️ No se pudo obtener el historial de pedidos:", e);
  }
}

function getActiveDiscount(product) {
  if (!product.discount || product.discount <= 0) return 0;

  // Si no está logueado o es primerizo -> Mostrar descuento
  if (!lastOrderDate) return product.discount;

  // Si tiene pedidos, solo mostrar si el producto se actualizó DESPUÉS del pedido
  const productUpdate = product.updated_at ? new Date(product.updated_at) : new Date(product.created_at || 0);
  if (productUpdate > lastOrderDate) {
    return product.discount;
  }

  // 🔑 ADMIN EXCLUSION: Los administradores siempre ven descuentos para previsualizar
  const user = window.supabaseAuth.getCurrentUser();
  if (user && user.rol === "admin") return product.discount;

  return 0; // Descuento agotado para este usuario
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

  // FICHA TÉCNICA DINÁMICA
  const specsContainer = safe("product-specs");
  if (specsContainer) {
    const leftSpecs = [
      { label: "Finca", value: product.finca, icon: "potted_plant" },
      { label: "Productor", value: product.productor, icon: "person" },
      { label: "Origen", value: product.origen, icon: "location_on" }
    ];

    const rightSpecs = [
      { label: "Altitud", value: product.altitud, icon: "landscape" },
      { label: "Variedad", value: product.variedad, icon: "psychiatry" },
      { label: "Proceso", value: product.proceso, icon: "settings_suggest" },
      { label: "Perfil", value: product.perfil, icon: "palette" }
    ];

    const renderSpec = s => `
      <div class="spec-item">
        <span class="material-symbols-outlined">${s.icon}</span>
        <div class="spec-info">
          <span class="spec-label">${s.label}</span>
          <span class="spec-value">${s.value}</span>
        </div>
      </div>
    `;

    specsContainer.innerHTML = `
      <div class="specs-col">
        ${leftSpecs.filter(s => s.value).map(renderSpec).join("")}
      </div>
      <div class="specs-col">
        ${rightSpecs.filter(s => s.value).map(renderSpec).join("")}
      </div>
    `;
  }

  const activeDiscount = getActiveDiscount(product);

  const priceEl = safe("product-price");
  priceEl.innerHTML = `L ${product.price}${activeDiscount > 0 ? ' <small class="price-discount-note">(con descuento)</small>' : ''}`;

  const img = safe("product-image");
  img.classList.remove("swap");
  void img.offsetWidth;
  img.classList.add("swap");

  img.src = product.image_url || "/imagenes/no-image.png";
  img.onerror = () => img.src = "/imagenes/no-image.png";

  // Badge de descuento (ajustado a product-img-inner)
  const imgInner = document.querySelector(".product-img-inner");
  if (imgInner) {
    const oldBadge = imgInner.querySelector(".discount-badge");
    if (oldBadge) oldBadge.remove();

    if (activeDiscount > 0) {
      const badge = document.createElement("div");
      badge.className = "discount-badge main-badge";
      badge.innerHTML = `${activeDiscount}% <span>OFF</span>`;

      // Estilo para posicionar sobre la bolsa (ajuste fino)
      badge.style.top = "10%";
      badge.style.right = "10%";

      imgInner.appendChild(badge);
    }
  }

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

  const favs = getFavorites();
  // Ordenar: Favoritos primero
  data.sort((a, b) => {
    const isA = favs.includes(a.id);
    const isB = favs.includes(b.id);
    if (isA && !isB) return -1;
    if (!isA && isB) return 1;
    return 0;
  });

  cont.innerHTML = data.map(p => {
    const activeFav = isFavorite(p.id) ? 'active' : '';
    const heartIcon = isFavorite(p.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const activeDiscount = getActiveDiscount(p);

    return `
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
      data-finca="${p.finca || ""}"
      data-altitud="${p.altitud || ""}"
      data-productor="${p.productor || ""}"
      data-origen="${p.origen || ""}"
      data-proceso="${p.proceso || ""}"
      data-perfil="${p.perfil || ""}"
      data-variedad="${p.variedad || ""}"
      data-discount="${activeDiscount}"
    >
      <div class="similar-img-cont">
        <img src="${p.image_url || "/imagenes/no-image.png"}"
             onerror="this.src='/imagenes/no-image.png'">
        ${activeDiscount > 0 ? `<div class="discount-badge">${activeDiscount}% <span>OFF</span></div>` : ""}
      </div>
      <div class="similar-info">
        <h4>${p.name}</h4>
        
        <div class="card-footer-3col">
          <span class="weight-label">1 lb</span>
          
          <button class="fav-btn ${activeFav}" onclick="event.stopPropagation(); toggleFavorite('${p.id}')">
            <i class="${heartIcon}"></i>
          </button>

          <div class="price-pill">L ${p.price}</div>
        </div>
      </div>
    </div>
  `;
  }).join("");

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
    image_url: firstCard.dataset.img,
    finca: firstCard.dataset.finca,
    altitud: firstCard.dataset.altitud,
    productor: firstCard.dataset.productor,
    origen: firstCard.dataset.origen,
    proceso: firstCard.dataset.proceso,
    perfil: firstCard.dataset.perfil,
    variedad: firstCard.dataset.variedad,
    discount: Number(firstCard.dataset.discount || 0)
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
        image_url: card.dataset.img,
        finca: card.dataset.finca,
        altitud: card.dataset.altitud,
        productor: card.dataset.productor,
        origen: card.dataset.origen,
        proceso: card.dataset.proceso,
        perfil: card.dataset.perfil,
        variedad: card.dataset.variedad,
        discount: Number(card.dataset.discount || 0)
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

  // 🔑 VISIBILIDAD DE FLECHAS
  const prev = safe("similar-prev");
  const next = safe("similar-next");
  if (prev) prev.classList.toggle("hidden", similarIndex === 0);
  if (next) next.classList.toggle("hidden", similarIndex === cards.length - 1);
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
  // initHeroCarousel(); // REMOVED: Replaced by hero-carousel.js
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

    const activeDiscount = getActiveDiscount(currentProduct);
    const finalPrice = activeDiscount > 0
      ? currentProduct.price * (1 - (activeDiscount / 100))
      : currentProduct.price;

    addToCart({
      product_id: productId,
      name: currentProduct.name,
      price: finalPrice,
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
  (async () => {
    await checkUserLastOrder();
    loadSimilarProducts();
  })();

  /* ===== SCROLL SUAVE A PRODUCTOS (SI HAY HASH) ===== */
  if (window.location.hash === "#productos") {
    setTimeout(() => {
      document.getElementById("productos")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 800);
  }
});

