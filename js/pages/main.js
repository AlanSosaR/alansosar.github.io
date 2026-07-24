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

    // Ya no mostramos el mensaje de "descuentos aplicados" para reducir ruido visual,
    // simplemente las píldoras dejarán de aparecer automáticamente.
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
   FORMATO TELÉFONO
========================= */
function formatPhoneLink(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    const pretty = `+${digits.slice(0,3)} ${digits.slice(3,7)}-${digits.slice(7)}`;
    return `<a href="https://wa.me/${digits}" target="_blank" class="contact-link">${pretty}</a>`;
  }
  const pretty = `+${digits.slice(0,3)} ${digits.slice(3,7)}-${digits.slice(7)}`;
  return `<a href="https://wa.me/${digits}" target="_blank" class="contact-link">${digits}</a>`;
}

/* =========================
   RENDER PRODUCTO PRINCIPAL
========================= */
function renderMainProduct(product) {
  currentProduct = product; // 🔑 CLAVE (NO QUITAR)

  safe("product-name").textContent = product.name || "";
  safe("product-description").textContent = product.description || "";

  const badge = [
    product.presentation,
    product.grind_type,
    product.category
  ].filter(Boolean).join(" · ");

  // FICHA TÉCNICA DINÁMICA
  const specsContainer = safe("product-specs");
  if (specsContainer) {
    const leftSpecs = [
      { label: "Finca", value: product.finca, icon: "/imagenes/field.png" },
      { label: "Productor", value: product.productor, icon: "/imagenes/farmer.png" },
      { label: "Origen", value: product.origen, icon: "/imagenes/map.png" },
      { label: "Fecha de tueste", value: product.fecha_tueste, icon: "/imagenes/calendar.png" }
    ];

    const rightSpecs = [
      { label: "Altitud", value: product.altitud, icon: "/imagenes/mountain.png" },
      { label: "Variedad", value: product.variedad, icon: "/imagenes/sprouts.png" },
      { label: "Proceso", value: product.proceso, icon: "/imagenes/smart-factory.png" },
      { label: "Perfil", value: product.perfil, icon: "palette" }
    ];

    const prepIcons = {
      "Filtro": "coffee_maker",
      "Prensa francesa": "air",
      "V60": "science",
      "Espresso": "local_cafe"
    };

    const renderSpec = s => {
      if (!s.value || s.value.trim() === "") return "";
      const isPng = s.icon.includes(".png");
      return `
        <div class="spec-item">
          ${isPng ? `<img src="${s.icon}" class="spec-icon-png" alt="${s.label}">` : `<span class="material-symbols-outlined">${s.icon}</span>`}
          <div class="spec-info">
            <span class="spec-label">${s.label}</span>
            <span class="spec-value">${s.value}</span>
          </div>
        </div>
      `;
    };

    const prepHtml = (() => {
      if (!product.preparation) return "";
      const items = product.preparation.split(",").map(v => v.trim()).filter(Boolean);
      if (!items.length) return "";
      const chips = items.map(v => `
        <span class="prep-chip">
          <span class="material-symbols-outlined">${prepIcons[v] || "local_cafe"}</span>
          ${v}
        </span>
      `).join("");
      return `
        <div class="spec-row-full">
          <div class="spec-info">
            <span class="spec-label">Recomendado para</span>
            <div class="prep-chips-wrap">${chips}</div>
          </div>
        </div>
      `;
    })();

    specsContainer.innerHTML = `
      <div class="specs-col">
        ${leftSpecs.filter(s => s.value).map(renderSpec).join("")}
      </div>
      <div class="specs-col">
        ${rightSpecs.filter(s => s.value).map(renderSpec).join("")}
      </div>
      ${prepHtml}
      <div class="spec-contact">
        <div class="contact-info-wrap">
          <img src="/imagenes/contact-mail.png" class="spec-icon-png" alt="Contacto">
          <div class="spec-info">
            <span class="spec-label">Contacto:</span>
            <span class="spec-value">
              ${formatPhoneLink(window.siteSettings?.whatsapp_numero || "50496670613")} / 
              ${formatPhoneLink(window.siteSettings?.whatsapp_numero2 || "50498675101")}
            </span>
          </div>
        </div>
        <img src="/imagenes/arabica.svg" class="arabica-seal" alt="100% Arábica">
      </div>
      <div class="product-footer-sheet">
        <div class="footer-text">
          <p class="enjoy-msg">¡Disfrútalo y Compártelo!</p>
          <span id="product-badge" class="pill" aria-live="polite"></span>
        </div>
      </div>
    `;

    const badgeEl = safe("product-badge");
    if (badgeEl) badgeEl.textContent = badge;
  }

  const activeDiscount = getActiveDiscount(product);
  const finalPrice = activeDiscount > 0 ? Math.floor(product.price * (1 - activeDiscount / 100)) : product.price;

  const priceEl = safe("product-price");
  priceEl.innerHTML = `L ${Number(finalPrice).toFixed(2)}${activeDiscount > 0 ? ' <small class="price-discount-note">(con descuento)</small>' : ''}`;

  const img = safe("product-image");
  img.classList.remove("swap");
  void img.offsetWidth;
  img.classList.add("swap");

  img.src = product.image_url || "/imagenes/no-image.png";
  img.onerror = () => img.src = "/imagenes/no-image.png";

  // Mover Badge de descuento al inicio de la columna de texto (no sobre la bolsa)
  const productText = document.querySelector(".product-text");
  if (productText) {
    const oldPill = productText.querySelector(".discount-pill");
    if (oldPill) oldPill.remove();

    if (activeDiscount > 0) {
      const pill = document.createElement("div");
      pill.className = "discount-pill main-pill";
      pill.innerHTML = `
        <span class="pill-off">${activeDiscount}% OFF</span>
        <span class="pill-label">en tu primer pedido</span>
      `;
      productText.prepend(pill);
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
  syncProductPrice();
}

/**
 * 🔑 Sincroniza el precio mostrado con la cantidad seleccionada
 */
function syncProductPrice() {
  if (!currentProduct) return;
  const qty = parseInt(safe("qty-number")?.textContent || "1", 10);
  const activeDiscount = getActiveDiscount(currentProduct);
  const unitPrice = activeDiscount > 0
    ? Math.floor(currentProduct.price * (1 - activeDiscount / 100))
    : currentProduct.price;

  const totalPrice = unitPrice * qty;
  const priceEl = safe("product-price");
  if (priceEl) {
    priceEl.innerHTML = `L ${Number(totalPrice).toFixed(2)}${activeDiscount > 0 ? ' <small class="price-discount-note">(con descuento)</small>' : ''}`;
  }
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
      data-tueste="${p.fecha_tueste || ""}"
      data-preparation="${p.preparation || ""}"
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
          <span class="weight-label">${[p.presentation, p.grind_type].filter(Boolean).join(" · ")}</span>
          
          <button class="fav-btn ${activeFav}" onclick="event.stopPropagation(); toggleFavorite('${p.id}')">
            <i class="${heartIcon}"></i>
          </button>

          <div class="price-pill">L ${Number(p.price).toFixed(2)}</div>
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
    fecha_tueste: firstCard.dataset.tueste,
    preparation: firstCard.dataset.preparation,
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
        fecha_tueste: card.dataset.tueste,
        preparation: card.dataset.preparation,
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
   CARGAR CONFIGURACIÓN DEL SITIO
======================== */
async function cargarSiteSettings() {
  await window.loadSiteSettings();
  const s = window.siteSettings;
  if (!s) return;

  // Nuestra historia
  const aboutTitle = document.querySelector(".about-title");
  const aboutSubtitle = document.querySelector(".about-subtitle");
  const aboutLead = document.querySelector(".about-lead");
  const aboutBody = document.querySelector(".about-body");
  const aboutImg = document.querySelector(".about-img img");

  if (aboutTitle && s.historia_titulo) aboutTitle.textContent = s.historia_titulo;
  if (aboutSubtitle && s.historia_subtitulo) aboutSubtitle.textContent = s.historia_subtitulo;
  if (aboutLead && s.historia_lead) aboutLead.textContent = s.historia_lead;
  if (aboutBody && s.historia_body) aboutBody.textContent = s.historia_body;
  if (aboutImg && s.historia_imagen_url) aboutImg.src = s.historia_imagen_url;

  // FAB — enlaces de contacto
  const fabLinks = document.querySelectorAll(".fab-options a");
  if (fabLinks.length >= 3) {
    if (s.whatsapp_numero) fabLinks[0].href = `https://wa.me/${s.whatsapp_numero.replace(/\D/g, "")}`;
    if (s.facebook_url) fabLinks[1].href = s.facebook_url;
    if (s.instagram_url) fabLinks[2].href = s.instagram_url;
  }
}

/* =========================
   DOM READY (ÚNICO Y CORRECTO)
======================== */
document.addEventListener("DOMContentLoaded", () => {

  syncHeaderCounter();
  cargarSiteSettings();
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
    syncProductPrice();
  });

  /* ===== BOTÓN MÁS ===== */
  safe("qty-plus")?.addEventListener("click", () => {
    qtyNumber.textContent = parseInt(qtyNumber.textContent, 10) + 1;

    updateQtyControls(
      safe("product-add").dataset.id,
      Number(safe("product-add").dataset.stock)
    );
    syncProductPrice();
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
      price_original: currentProduct.price,
      discount_percent: activeDiscount,
      img: currentProduct.image_url,
      qty,
      category: currentProduct.category || '',
      presentation: currentProduct.presentation || '',
      grind: currentProduct.grind_type || ''
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

  /* ===== RESEÑAS ===== */
  cargarResenas();
});

let reviewIndex = 0;
let reviewChannel = null;

function updateReviewsUI() {
  const list = document.getElementById("lista-resenas");
  if (!list) return;
  const cards = list.querySelectorAll(".review-card");
  const dots = document.querySelectorAll("#reviews-dots .dot");
  if (!cards.length) return;
  const rect = cards[0].getBoundingClientRect();
  if (rect.width === 0) return;
  const gap = parseInt(getComputedStyle(list).gap || "24", 10);
  const CARD_WIDTH = rect.width + gap;
  list.scrollTo({ left: CARD_WIDTH * reviewIndex, behavior: "smooth" });
  cards.forEach((c, i) => c.classList.toggle("active", i === reviewIndex));
  dots.forEach((d, i) => d.classList.toggle("active", i === reviewIndex));
  const prev = document.getElementById("reviews-prev");
  const next = document.getElementById("reviews-next");
  if (prev) prev.style.display = reviewIndex === 0 ? "none" : "flex";
  if (next) next.style.display = reviewIndex === cards.length - 1 ? "none" : "flex";
}

function initReviewCarousel() {
  const prev = document.getElementById("reviews-prev");
  const next = document.getElementById("reviews-next");
  if (prev) prev.onclick = () => { if (reviewIndex > 0) { reviewIndex--; updateReviewsUI(); } };
  if (next) next.onclick = () => {
    const cards = document.querySelectorAll("#lista-resenas .review-card");
    if (reviewIndex < cards.length - 1) { reviewIndex++; updateReviewsUI(); }
  };
  requestAnimationFrame(() => { requestAnimationFrame(updateReviewsUI); });
}

async function cargarResenas() {
  const container = document.getElementById("reviews-container");
  if (!container) return;

  try {
    const { data: reviews, error } = await window.supabaseClient
      .from("reviews")
      .select("id, rating, comment, order_id, user_id")
      .or("hidden.is.null,hidden.eq.false")
      .order("created_at", { ascending: false })
      .limit(9);

    if (error || !reviews?.length) {
      container.innerHTML = `
        <div class="reviews-empty">
          <span class="material-symbols-outlined" style="font-size:40px;color:#E0E0E0;">rate_review</span>
          <p>Aún no hay reseñas. ¡Sé el primero en compartir tu opinión!</p>
        </div>`;
      return;
    }

    const userIds = [...new Set(reviews.map(r => r.user_id))];

    const { data: users } = await window.supabaseClient
      .from("users")
      .select("id, name, photo_url")
      .in("id", userIds);

    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
    const userPhotoMap = Object.fromEntries((users || []).map(u => [u.id, u.photo_url]));

    const cardsHtml = reviews.map((r, idx) => {
      const photo = userPhotoMap[r.user_id];
      return `
      <div class="review-card${idx === 0 ? ' active' : ''}" data-index="${idx}">
        <div class="review-card-info">
          <p class="review-card-comment">"${r.comment || 'Sin comentario'}"</p>
          <div class="review-card-stars">
            ${Array(5).fill(0).map((_, i) =>
              `<span class="star${i < r.rating ? ' active' : ''}">★</span>`
            ).join('')}
          </div>
          <div class="review-card-author-row">
            ${photo ? `<img src="${photo}" alt="" class="review-card-avatar">` : ''}
            <span class="review-card-author">- ${userMap[r.user_id] || "Cliente"}</span>
          </div>
        </div>
      </div>`;
    }).join("");

    const dotsHtml = reviews.map((_, i) =>
      `<span class="dot${i === 0 ? ' active' : ''}"></span>`
    ).join("");

    container.innerHTML = `
      <div class="carousel-container with-arrows">
        <button id="reviews-prev" class="carousel-prev-circle inside" aria-label="Anterior" style="display:none">
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <div class="reviews-list" id="lista-resenas">
          ${cardsHtml}
        </div>

        <button id="reviews-next" class="carousel-next-circle inside" aria-label="Siguiente">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div class="carousel-nav desktop-only">
        <div class="carousel-dots" id="reviews-dots">
          ${dotsHtml}
        </div>
      </div>
    `;

    reviewIndex = 0;

    // Click en card para activarla
    document.querySelectorAll("#lista-resenas .review-card").forEach(card => {
      card.addEventListener("click", () => {
        const idx = Number(card.dataset.index);
        if (!isNaN(idx)) { reviewIndex = idx; updateReviewsUI(); }
      });
    });

    initReviewCarousel();

    // Realtime: re-cargar cuando cambie visibilidad de reseñas
    if (!reviewChannel) {
      reviewChannel = window.supabaseClient
        .channel("reviews-changes")
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "reviews", filter: "hidden=eq.true" },
          () => { cargarResenas(); }
        )
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "reviews", filter: "hidden=eq.false" },
          () => { cargarResenas(); }
        )
        .subscribe();
    }
  } catch (e) {
    console.error("⚠️ Error al cargar reseñas:", e);
    const section = document.getElementById("resenas");
    if (section) section.style.display = "none";
  }
}

