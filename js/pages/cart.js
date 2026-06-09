/* ============================================================
   Carrito — Café Cortero 2025 (FINAL DEFINITIVO)
   ✔ Render del carrito SIEMPRE (logueado o no)
   ✔ Validaciones SOLO al "Proceder al pago"
   ✔ Bloquea admin (solo clientes compran)
   ✔ Valida que product_id exista en BD (products)
   ✔ Snackbar genérico #snackbar
   ✔ Contador del header controlado por header.js
   ✔ Título del header sincronizado (X cafés)
============================================================ */

const CART_KEY = "cafecortero_cart";
const CHECKOUT_KEY = "checkout_cart";

/* ================= HELPERS ================= */
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

function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* ================= HEADER (BADGE) ================= */
function syncHeaderCounter() {
  if (typeof window.updateHeaderCartCount === "function") {
    window.updateHeaderCartCount();
  }
}

/* ================= SNACKBAR ================= */
function showSnackbar(message, duration = 3000, action = null) {
  const el = document.getElementById("snackbar");
  if (!el) return;

  // Limpiar contenido previo y establecer mensaje
  el.innerHTML = `<span>${message}</span>`;

  if (action && action.text && action.callback) {
    const btn = document.createElement("button");
    btn.textContent = action.text;
    btn.className = "snackbar-action-btn";
    btn.onclick = () => {
      action.callback();
      el.classList.remove("show");
      el.classList.add("hidden");
    };
    el.appendChild(btn);
    // Extender duración si hay acción
    duration = 6000;
  }

  el.classList.remove("hidden");
  el.classList.add("show");

  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hidden");
  }, duration);
}

/* ================= HEADER (TÍTULO) ================= */
function updateHeaderCartTitle(cart) {
  const label = document.getElementById("count-items");
  if (!label) return;

  const total = cart.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  label.textContent = `Tienes ${total} ${total === 1 ? "café agregado" : "cafés agregados"} a tu pedido`;
}

/* ================= RENDER ================= */
let stocksCache = {};

async function fetchStocks(ids) {
  if (!ids.length) return;
  const sb = getSupabaseClient();
  if (!sb) return;

  const { data } = await sb.from("products").select("id, stock").in("id", ids);
  if (data) {
    data.forEach(p => stocksCache[p.id] = p.stock);
  }
}

/* ================= LÓGICA DE CUPONES ================= */
let appliedCoupon = null;

function calculateDiscount(subtotal, cart) {
  if (appliedCoupon) {
    return {
      percent: appliedCoupon.percent,
      amount: subtotal * (appliedCoupon.percent / 100),
      label: `Cupón ${appliedCoupon.code} (-${appliedCoupon.percent}%)`
    };
  }

  let discountTotal = 0;
  cart.forEach(item => {
    // Si el item tiene descuento por producto (ej: primera compra)
    if (item.discount_percent > 0) {
      const original = Number(item.price_original || 0);
      const current = Number(item.price || 0);
      const diff = original - current;
      if (diff > 0) {
        discountTotal += (diff * item.qty);
      }
    }
  });

  return {
    percent: 0,
    amount: discountTotal,
    label: "Descuento aplicado"
  };
}

async function renderCart() {
  const cart = getCart();
  const ids = [...new Set(cart.map(i => i.product_id))];

  await fetchStocks(ids);
  updateHeaderCartTitle(cart);

  const container = document.getElementById("cart-container");
  const subtotalLabel = document.getElementById("subtotal-label");
  const totalLabel = document.getElementById("total-label");
  const discountRow = document.getElementById("discount-row");
  const discountLabel = document.getElementById("discount-amount");
  const discountDesc = document.getElementById("discount-description");
  const resumenBox = document.querySelector(".resumen-box");
  const main = document.querySelector("main");

  if (!container) return;
  container.innerHTML = "";

  if (!cart.length) {
    main?.classList.add("carrito-vacio-activo");
    document.body.classList.add("carrito-vacio");
    const headerNav = document.getElementById("cart-header-nav");
    if (headerNav) headerNav.style.display = "none";
    if (resumenBox) resumenBox.style.display = "none";
    container.innerHTML = `
      <div class="empty-container">
        <div class="empty-title">Tu selección está vacía</div>
        <div class="empty-sub">Agrega tu café favorito para continuar.</div>
        <div class="empty-img-box">
          <img src="/imagenes/empty/empty-cart.svg" alt="Carrito vacio" class="empty-img">
        </div>
        <button class="empty-btn" onclick="location.href='/pages/home/index.html#productos'">
          Seguir comprando
        </button>
      </div>
    `;
    return;
  }

  main?.classList.remove("carrito-vacio-activo");
  document.body.classList.remove("carrito-vacio");
  if (resumenBox) resumenBox.style.display = "block";

  const template = document.getElementById("template-cart-item");
  let subtotalOriginal = 0;
  let totalConDescuentoItems = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".item-image").src = item.img || "";
    clone.querySelector(".item-name").textContent = item.name || "Producto";

    // Desglose de precios por ítem
    const priceOldEl = clone.querySelector(".item-price-old");
    const discountBadgeEl = clone.querySelector(".item-discount-badge");
    const currentPriceEl = clone.querySelector(".item-price");

    if (item.discount_percent > 0) {
      if (priceOldEl) {
        priceOldEl.textContent = `L ${Number(item.price_original || 0).toFixed(2)}`;
        priceOldEl.classList.remove("hidden");
      }
      if (discountBadgeEl) {
        discountBadgeEl.textContent = `${item.discount_percent}% OFF`;
        discountBadgeEl.classList.remove("hidden");
      }
    }

    currentPriceEl.textContent = `L ${Number(item.price || 0).toFixed(2)} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty || 1;

    const stock = stocksCache[item.product_id] ?? 999;
    const btnPlus = clone.querySelector('[data-action="plus"]');
    if (btnPlus && item.qty >= stock) btnPlus.disabled = true;

    if (item.qty >= stock) {
      const warning = document.createElement("div");
      warning.className = "stock-warning";
      warning.textContent = item.qty > stock ? "⚠ Cantidad supera el stock" : "No nos quedan más bolsas de café en inventario";
      clone.querySelector(".item-info").appendChild(warning);
    }

    clone.querySelectorAll("button").forEach(btn => btn.dataset.index = index);

    const original = Number(item.price_original || item.price || 0);
    const current = Number(item.price || 0);

    subtotalOriginal += original * item.qty;
    totalConDescuentoItems += current * item.qty;

    container.appendChild(clone);
  });

  const discountFromItems = subtotalOriginal - totalConDescuentoItems;
  const subtotalParaCupon = totalConDescuentoItems;

  let discountFromCoupon = 0;

  if (appliedCoupon) {
    discountFromCoupon = subtotalParaCupon * (appliedCoupon.percent / 100);
  }

  const totalFinal = subtotalOriginal - discountFromItems - discountFromCoupon;

  if (subtotalLabel) subtotalLabel.textContent = `L ${subtotalOriginal.toFixed(2)}`;

  // Fila de Ahorro por productos
  const itemsRow = document.getElementById("items-discount-row");
  const itemsAmount = document.getElementById("items-discount-amount");
  if (discountFromItems > 0) {
    itemsRow?.classList.remove("hidden");
    if (itemsAmount) itemsAmount.textContent = `-L ${discountFromItems.toFixed(2)}`;
  } else {
    itemsRow?.classList.add("hidden");
  }

  // Fila de Cupón
  const couponRow = document.getElementById("coupon-discount-row");
  const couponAmount = document.getElementById("coupon-discount-amount");
  const couponDesc = document.getElementById("coupon-discount-description");
  if (discountFromCoupon > 0 && appliedCoupon) {
    couponRow?.classList.remove("hidden");
    if (couponDesc) couponDesc.textContent = `${appliedCoupon.code} (-${appliedCoupon.percent}%)`;
    if (couponAmount) couponAmount.textContent = `-L ${discountFromCoupon.toFixed(2)}`;
  } else {
    couponRow?.classList.add("hidden");
  }

  if (totalLabel) totalLabel.textContent = `L ${totalFinal.toFixed(2)}`;
  syncHeaderCounter();
}

// Lógica de aplicar cupón
document.getElementById("apply-coupon-btn")?.addEventListener("click", () => {
  const input = document.getElementById("coupon-input");
  const code = input.value.trim().toUpperCase();
  const msgBox = document.getElementById("coupon-message");
  const msgText = document.getElementById("coupon-text");

  if (!code) return;

  if (code === "CORTERO15") {
    appliedCoupon = { code: "CORTERO15", percent: 15 };
    msgBox.classList.remove("hidden");
    msgText.textContent = `Cupón ${code} aplicado (-15%)`;
    input.disabled = true;
    const btn = document.getElementById("apply-coupon-btn");
    if (btn) btn.disabled = true;
    renderCart();
    showSnackbar("¡Cupón aplicado con éxito!");
  } else {
    showSnackbar("El cupón ingresado no es válido.");
    input.value = "";
  }
});

/* ================= CONTROLES +/-/DELETE ================= */
document.getElementById("cart-container")?.addEventListener("click", async e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;
  const cart = getCart();

  if (!cart[index]) return;

  if (action === "plus") {
    const stock = stocksCache[cart[index].product_id];
    if (cart[index].qty < stock) {
      cart[index].qty++;
    } else {
      showSnackbar("Stock máximo alcanzado para este producto");
    }
  }
  if (action === "minus") {
    cart[index].qty--;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  }
  if (action === "del") cart.splice(index, 1);

  saveCart(cart);
  await renderCart();
});

/* ================= CHECKOUT ================= */
document.getElementById("proceder-btn")?.addEventListener("click", async () => {
  const cart = getCart();
  if (!cart.length) return;

  const sb = getSupabaseClient();
  if (!sb) {
    location.href = "/pages/auth/login.html?redirect=carrito";
    return;
  }

  const { data, error: sessionError } = await sb.auth.getSession();
  if (sessionError) {
    showSnackbar("No se pudo validar tu sesión. Intenta de nuevo.");
    return;
  }

  if (!data?.session) {
    showSnackbar("Debes iniciar sesión para procesar tu pedido. Serás redireccionado al login.", 5000, {
      text: "Aceptar",
      callback: () => {
        location.href = "/pages/auth/login.html?redirect=carrito";
      }
    });
    return;
  }

  const authUser = data.session.user;
  const authId = authUser.id;
  const authEmail = authUser.email;

  let userRow = null;

  const { data: byId, error: errById } = await sb
    .from("users")
    .select("rol")
    .eq("id", authId)
    .maybeSingle();

  if (errById) {
    showSnackbar("No se pudo validar tu cuenta.");
    return;
  }

  userRow = byId;

  if (!userRow && authEmail) {
    const { data: byEmail, error: errByEmail } = await sb
      .from("users")
      .select("rol")
      .eq("email", authEmail)
      .maybeSingle();

    if (errByEmail) {
      showSnackbar("No se pudo validar tu cuenta.");
      return;
    }

    userRow = byEmail;
  }

  if (!userRow) {
    showSnackbar("Tu usuario no está registrado.");
    return;
  }

  const invalid = cart.some(p => !p.product_id);
  if (invalid) {
    showSnackbar("Algunos productos necesitan actualizarse. Vuelve a agregarlos.");
    return;
  }

  const ids = [...new Set(cart.map(i => String(i.product_id)))];
  const { data: products, error: productsError } = await sb
    .from("products")
    .select("id, stock, name")
    .in("id", ids);

  if (productsError) {
    showSnackbar("No se pudo validar el carrito. Intenta de nuevo.");
    return;
  }

  const stockMap = {};
  (products || []).forEach(p => stockMap[String(p.id)] = { stock: p.stock, name: p.name });

  const missing = ids.filter(id => !stockMap[id]);
  if (missing.length) {
    showSnackbar("Algunos productos ya no están disponibles. Vuelve a agregarlos.");
    return;
  }

  for (const item of cart) {
    const meta = stockMap[String(item.product_id)];
    if (item.qty > meta.stock) {
      showSnackbar(`Lo sentimos, solo quedan ${meta.stock} unidades de ${meta.name}.`);
      return;
    }
  }

  localStorage.setItem(CHECKOUT_KEY, JSON.stringify(cart));
  location.href = "/pages/profile/datos_cliente.html";
});

/* ================= INIT ================= */
renderCart();

document.addEventListener("header:ready", () => {
  syncHeaderCounter();
});
