/* ============================================================
   📦 datos_cliente.js — REDISEÑO PREMIUM 2025
============================================================ */

console.log("📦 datos_cliente.js — Rediseño Checkout Iniciado");

/* ============================================================
   ESPERAR SUPABASE
============================================================ */
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
}

/* ============================================================
   CAMPOS & SELECTORES
============================================================ */
const form = document.getElementById("cliente-form");
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const ciudadInput = document.getElementById("ciudad");
const zonaSelect = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput = document.getElementById("nota");
const btnSubmit = document.getElementById("btn-submit");

// Resumen del pedido
const summaryItemsContainer = document.getElementById("summary-items");
const sumSubtotalEl = document.getElementById("sum-subtotal");
const sumShippingEl = document.getElementById("sum-shipping");
const sumTotalEl = document.getElementById("sum-total");
const sumDiscountRow = document.getElementById("sum-discount-row");
const sumDiscountAmount = document.getElementById("sum-discount-amount");
const summaryCouponBox = document.getElementById("summary-coupon");
const couponCodeText = document.getElementById("coupon-code-text");

let userCache = null;
let userId = null;
let loadedAddressId = null;

/* ============================================================
   UI — ERRORES & LABELS
============================================================ */
function mostrarError(input, mensaje) {
  const field = input.closest(".m3-field");
  if (!field) return;

  field.classList.add("error");
  let helper = field.querySelector(".helper-text");
  if (!helper) {
    helper = document.createElement("div");
    helper.className = "helper-text";
    field.appendChild(helper);
  }
  helper.textContent = mensaje;
}

function limpiarError(input) {
  const field = input.closest(".m3-field");
  if (!field) return;

  field.classList.remove("error");
  const helper = field.querySelector(".helper-text");
  if (helper) helper.textContent = "";
}

function activarLabel(input) {
  // En el nuevo diseño disparamos el evento para que el CSS (placeholder-shown) reaccione
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   CHECKOUT CART & RESUMEN
============================================================ */
const CHECKOUT_KEY = "checkout_cart";
const COUPON_KEY = "applied_coupon";

function getCheckoutCart() {
  try {
    return JSON.parse(localStorage.getItem(CHECKOUT_KEY)) || [];
  } catch {
    return [];
  }
}

function getAppliedCoupon() {
  try {
    return JSON.parse(localStorage.getItem(COUPON_KEY));
  } catch {
    return null;
  }
}

function renderResumen() {
  const cart = getCheckoutCart();
  const coupon = getAppliedCoupon();

  if (!cart.length) {
    window.location.href = "/pages/shop/carrito.html";
    return;
  }

  summaryItemsContainer.innerHTML = "";
  let subtotalOriginal = 0;
  let totalConDescuentoItems = 0;

  cart.forEach(item => {
    const originalPrice = Number(item.price_original || item.price || 0);
    const currentPrice = Number(item.price || 0);
    const qty = Number(item.qty || 1);

    subtotalOriginal += originalPrice * qty;
    totalConDescuentoItems += currentPrice * qty;

    const itemDiv = document.createElement("div");
    itemDiv.className = "summary-item";
    itemDiv.innerHTML = `
      <img src="${item.img || '/imagenes/no-image.png'}" alt="${item.name}" class="item-img">
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-details">Cant: ${qty}</div>
        <div class="item-price">L ${currentPrice.toFixed(2)}</div>
      </div>
    `;
    summaryItemsContainer.appendChild(itemDiv);
  });

  const ahorroItems = subtotalOriginal - totalConDescuentoItems;
  let subtotalResumen = totalConDescuentoItems;
  let couponDiscount = 0;

  if (coupon) {
    // El cupón se aplica sobre el subtotal ya descontado por productos
    couponDiscount = subtotalResumen * (coupon.percent / 100);
    couponCodeText.textContent = coupon.code;
    summaryCouponBox.classList.remove("hidden");
  }

  const totalAhorro = ahorroItems + couponDiscount;
  const shipping = 60; // Fijo según diseño
  const finalTotal = totalConDescuentoItems - couponDiscount + shipping;

  sumSubtotalEl.textContent = `L ${subtotalOriginal.toFixed(2)}`;
  sumShippingEl.textContent = `L ${shipping.toFixed(2)}`;

  if (totalAhorro > 0) {
    sumDiscountRow.classList.remove("hidden");
    sumDiscountAmount.textContent = `- L ${totalAhorro.toFixed(2)}`;
  } else {
    sumDiscountRow.classList.add("hidden");
  }

  sumTotalEl.textContent = `L ${finalTotal.toFixed(2)}`;
}

/* ============================================================
   VALIDACIONES & PERSISTENCIA
============================================================ */
function validarFormulario() {
  let ok = true;
  limpiarError(nombreInput);
  limpiarError(telefonoInput);
  limpiarError(ciudadInput);
  limpiarError(zonaSelect);
  limpiarError(direccionInput);

  if (!nombreInput.value.trim()) { mostrarError(nombreInput, "El nombre es obligatorio"); ok = false; }
  if (!telefonoInput.value.trim()) { mostrarError(telefonoInput, "El teléfono es obligatorio"); ok = false; }
  if (!ciudadInput.value.trim()) { mostrarError(ciudadInput, "La ciudad es obligatoria"); ok = false; }
  if (!zonaSelect.value) { mostrarError(zonaSelect, "Selecciona un departamento"); ok = false; }
  if (!direccionInput.value.trim()) { mostrarError(direccionInput, "La dirección es obligatoria"); ok = false; }

  return ok;
}

async function cargarDatosRealtime() {
  const { data } = await window.supabaseClient.from("users").select("*").eq("id", userId).single();
  if (!data) return;

  nombreInput.value = data.name || "";
  correoInput.value = data.email || "";
  telefonoInput.value = data.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);

  localStorage.setItem("cortero_user", JSON.stringify(data));
  await cargarDireccion();
}

async function cargarDireccion() {
  const { data } = await window.supabaseClient
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || !data.length) return;
  const addr = data[0];
  loadedAddressId = addr.id;

  ciudadInput.value = addr.city || "";
  zonaSelect.value = addr.state || "";
  direccionInput.value = addr.street || "";

  activarLabel(ciudadInput);
  activarLabel(direccionInput);
  activarLabel(zonaSelect);
}

async function guardarTodo() {
  const userUpdate = window.supabaseClient.from("users").update({
    name: nombreInput.value.trim(),
    phone: telefonoInput.value.trim()
  }).eq("id", userId);

  const addressPayload = {
    user_id: userId,
    full_name: nombreInput.value.trim(),
    phone: telefonoInput.value.trim(),
    country: "Honduras",
    state: zonaSelect.value.trim(),
    city: ciudadInput.value.trim(),
    street: direccionInput.value.trim(),
    postal_code: "",
    is_default: true
  };

  const addressAction = loadedAddressId
    ? window.supabaseClient.from("addresses").update(addressPayload).eq("id", loadedAddressId)
    : window.supabaseClient.from("addresses").insert(addressPayload);

  const [resUser, resAddr] = await Promise.all([userUpdate, addressAction]);
  return !resUser.error && !resAddr.error;
}

/* ============================================================
   EVENTS & INIT
============================================================ */
form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!validarFormulario()) return;

  btnSubmit.classList.add("loading");
  btnSubmit.disabled = true;

  const success = await guardarTodo();
  if (!success) {
    btnSubmit.classList.remove("loading");
    btnSubmit.disabled = false;
    alert("Error al guardar la información. Intenta de nuevo.");
    return;
  }

  sessionStorage.setItem("current_order_notes", notaInput.value.trim());
  // Guardar método de envío seleccionado
  const selectedShipping = document.querySelector('input[name="envio"]:checked')?.value || "express";
  sessionStorage.setItem("checkout_shipping_method", selectedShipping);

  setTimeout(() => window.location.href = "/pages/shop/recibo.html", 800);
});

(async function init() {
  await esperarSupabase();
  userCache = JSON.parse(localStorage.getItem("cortero_user"));
  if (!userCache) return window.location.href = "/pages/auth/login.html";

  userId = userCache.id;
  renderResumen();
  await cargarDatosRealtime();

  // Listeners para limpiar errores
  [nombreInput, telefonoInput, ciudadInput, direccionInput, zonaSelect].forEach(el => {
    el.addEventListener("input", () => limpiarError(el));
  });
})();
