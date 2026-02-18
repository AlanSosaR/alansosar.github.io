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
  const shipping = 0; // Envío Gratis solicitado
  const finalTotal = totalConDescuentoItems - couponDiscount + shipping;

  sumSubtotalEl.textContent = `L ${subtotalOriginal.toFixed(2)}`;
  sumShippingEl.textContent = `Gratis`;

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

  // Notificar al mapa para que se posicione en la ciudad/dirección cargada
  window.dispatchEvent(new CustomEvent("cortero:direccionCargada", {
    detail: {
      ciudad: addr.city || "",
      direccion: addr.street || ""
    }
  }));
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
  // El método de envío ahora es fijo (gratis/estándar) tras la simplificación
  sessionStorage.setItem("checkout_shipping_method", "gratis");

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

/* ============================================================
   MAPA INTERACTIVO — LEAFLET + NOMINATIM
============================================================ */
(function initMap() {
  // Esperar a que Leaflet esté disponible
  if (typeof L === "undefined") {
    window.addEventListener("load", initMap);
    return;
  }

  // Coordenadas iniciales: Honduras (Danlí, El Paraíso)
  const HONDURAS_CENTER = [14.0, -86.58];
  const INITIAL_ZOOM = 7;

  // Inicializar mapa
  const map = L.map("delivery-map", {
    center: HONDURAS_CENTER,
    zoom: INITIAL_ZOOM,
    zoomControl: true,
    scrollWheelZoom: false // Evitar scroll accidental en móvil
  });

  // Tiles de OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  // Ícono personalizado verde
  const greenIcon = L.divIcon({
    className: "",
    html: `<div style="
      width: 32px; height: 32px;
      background: #2e7d32;
      border: 3px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 12px rgba(46,125,50,0.4);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36]
  });

  let marker = null;
  const statusEl = document.getElementById("map-status");

  function setStatus(msg, type = "") {
    statusEl.textContent = msg;
    statusEl.className = "map-status" + (type ? ` ${type}` : "");
    if (!msg) statusEl.classList.add("hidden");
  }

  function setMarker(lat, lng, popupText) {
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { icon: greenIcon, draggable: true }).addTo(map);

      // Al arrastrar el pin → geocodificación inversa
      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        await reverseGeocode(pos.lat, pos.lng);
      });
    }

    if (popupText) {
      marker.bindPopup(`<b>📍 Punto de entrega</b><br>${popupText}`).openPopup();
    }

    // Guardar coordenadas
    sessionStorage.setItem("delivery_lat", lat);
    sessionStorage.setItem("delivery_lng", lng);
  }

  // Geocodificación: dirección → coordenadas
  async function geocodeAddress(address) {
    if (!address || address.length < 5) return;
    setStatus("🔍 Buscando dirección...", "searching");

    try {
      const query = encodeURIComponent(address + ", Honduras");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=hn`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);

        map.flyTo([latNum, lonNum], 15, { animate: true, duration: 1.2 });
        setMarker(latNum, lonNum, display_name);
        setStatus("✅ Ubicación encontrada en el mapa");
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("⚠️ No se encontró la dirección. Intenta ser más específico.", "error");
        setTimeout(() => setStatus(""), 4000);
      }
    } catch {
      setStatus("⚠️ Error al buscar. Verifica tu conexión.", "error");
      setTimeout(() => setStatus(""), 4000);
    }
  }

  // Geocodificación inversa: coordenadas → dirección
  async function reverseGeocode(lat, lng) {
    setStatus("🔍 Obteniendo dirección...", "searching");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();

      if (data && data.display_name) {
        // Extraer la parte útil de la dirección
        const addr = data.address;
        const parts = [
          addr.road || addr.pedestrian || addr.footway,
          addr.house_number,
          addr.neighbourhood || addr.suburb,
          addr.city || addr.town || addr.village
        ].filter(Boolean);

        const shortAddr = parts.length > 0 ? parts.join(", ") : data.display_name;
        direccionInput.value = shortAddr;
        direccionInput.dispatchEvent(new Event("input", { bubbles: true }));
        setMarker(lat, lng, shortAddr);
        setStatus("✅ Dirección actualizada");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch {
      setStatus("⚠️ No se pudo obtener la dirección.", "error");
      setTimeout(() => setStatus(""), 4000);
    }
  }

  // Clic en el mapa → geocodificación inversa
  map.on("click", async (e) => {
    const { lat, lng } = e.latlng;
    setMarker(lat, lng, null);
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15));
    await reverseGeocode(lat, lng);
  });

  // ── Debounce compartido ──────────────────────────────────────
  let debounceTimer = null;

  // Función para construir la query combinando ciudad + dirección
  function buildQuery() {
    const ciudadEl = document.getElementById("ciudad");
    const dirEl = document.getElementById("direccion");
    const ciudad = ciudadEl ? ciudadEl.value.trim() : "";
    const dir = dirEl ? dirEl.value.trim() : "";

    if (dir.length >= 4 && ciudad.length >= 2) {
      return { query: `${dir}, ${ciudad}, Honduras`, zoom: 16 };
    } else if (ciudad.length >= 3) {
      return { query: `${ciudad}, Honduras`, zoom: 13 };
    }
    return null;
  }

  // Geocodificación con zoom específico
  async function geocodeQuery(query, zoom) {
    if (!query) return;
    setStatus("🔍 Buscando en el mapa...", "searching");
    try {
      const q = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=hn`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const latNum = parseFloat(data[0].lat);
        const lonNum = parseFloat(data[0].lon);
        map.flyTo([latNum, lonNum], zoom, { animate: true, duration: 1.2 });
        setMarker(latNum, lonNum, data[0].display_name);
        setStatus("✅ Ubicación encontrada");
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("⚠️ No se encontró. Intenta ser más específico.", "error");
        setTimeout(() => setStatus(""), 4000);
      }
    } catch {
      setStatus("⚠️ Error al buscar. Verifica tu conexión.", "error");
      setTimeout(() => setStatus(""), 4000);
    }
  }

  // Listener: campo Ciudad
  const ciudadEl = document.getElementById("ciudad");
  if (ciudadEl) {
    ciudadEl.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const result = buildQuery();
      if (result) {
        debounceTimer = setTimeout(() => geocodeQuery(result.query, result.zoom), 900);
      }
    });
  }

  // ── AUTOCOMPLETADO DE DIRECCIÓN ──────────────────────────────
  const direccionEl = document.getElementById("direccion");
  const suggestionsList = document.getElementById("direccion-suggestions");

  function hideSuggestions() {
    if (suggestionsList) suggestionsList.classList.add("hidden");
  }

  function showSuggestions(results) {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = "";

    if (!results || results.length === 0) {
      hideSuggestions();
      return;
    }

    results.forEach(item => {
      const addr = item.address || {};
      // Parte principal: calle o nombre del lugar
      const mainParts = [
        item.name || addr.road || addr.pedestrian || addr.amenity || addr.building,
        addr.house_number
      ].filter(Boolean);
      const main = mainParts.join(" ") || item.display_name.split(",")[0];

      // Parte secundaria: barrio, ciudad
      const subParts = [
        addr.neighbourhood || addr.suburb || addr.quarter,
        addr.city || addr.town || addr.village || addr.municipality
      ].filter(Boolean);
      const sub = subParts.join(", ") || "";

      const li = document.createElement("li");
      li.innerHTML = `
        <span class="material-symbols-outlined sug-icon">location_on</span>
        <div class="sug-text">
          <div class="sug-main">${main}</div>
          ${sub ? `<div class="sug-sub">${sub}</div>` : ""}
        </div>
      `;

      li.addEventListener("mousedown", (e) => {
        // mousedown antes del blur para capturar el clic
        e.preventDefault();
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        // Llenar el campo con la dirección limpia
        const fullAddr = [main, sub].filter(Boolean).join(", ");
        direccionEl.value = fullAddr;
        direccionEl.dispatchEvent(new Event("input", { bubbles: true }));

        // Mover el mapa
        map.flyTo([lat, lon], 17, { animate: true, duration: 1.2 });
        setMarker(lat, lon, fullAddr);
        setStatus("✅ Dirección seleccionada");
        setTimeout(() => setStatus(""), 3000);

        // Guardar coordenadas
        sessionStorage.setItem("delivery_lat", lat);
        sessionStorage.setItem("delivery_lng", lon);

        hideSuggestions();
      });

      suggestionsList.appendChild(li);
    });

    suggestionsList.classList.remove("hidden");
  }

  async function fetchSuggestions(query) {
    if (!query || query.length < 4) { hideSuggestions(); return; }
    const ciudadVal = ciudadEl ? ciudadEl.value.trim() : "";
    const q = encodeURIComponent(query + (ciudadVal ? `, ${ciudadVal}` : "") + ", Honduras");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=hn&addressdetails=1`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      showSuggestions(data);
    } catch {
      hideSuggestions();
    }
  }

  if (direccionEl) {
    direccionEl.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const val = direccionEl.value.trim();
      if (val.length >= 4) {
        debounceTimer = setTimeout(() => fetchSuggestions(val), 600);
      } else {
        hideSuggestions();
      }
    });

    // Cerrar al perder el foco (con pequeño delay para permitir el clic)
    direccionEl.addEventListener("blur", () => {
      setTimeout(hideSuggestions, 200);
    });

    // Cerrar con Escape
    direccionEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSuggestions();
    });
  }

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".m3-field")) hideSuggestions();
  });

  // Botón GPS
  const btnGps = document.getElementById("btn-gps");
  if (btnGps) {
    btnGps.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setStatus("⚠️ Tu navegador no soporta geolocalización.", "error");
        return;
      }
      btnGps.classList.add("loading-gps");
      btnGps.querySelector(".material-symbols-outlined").textContent = "sync";
      setStatus("📡 Obteniendo tu ubicación...", "searching");

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 });
          setMarker(latitude, longitude, null);
          await reverseGeocode(latitude, longitude);
          btnGps.classList.remove("loading-gps");
          btnGps.querySelector(".material-symbols-outlined").textContent = "my_location";
        },
        () => {
          setStatus("⚠️ No se pudo obtener tu ubicación. Activa el GPS.", "error");
          setTimeout(() => setStatus(""), 4000);
          btnGps.classList.remove("loading-gps");
          btnGps.querySelector(".material-symbols-outlined").textContent = "my_location";
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  // Si ya hay datos cargados desde Supabase, posicionar el mapa
  window.addEventListener("cortero:direccionCargada", (e) => {
    if (e.detail) {
      const { ciudad, direccion } = e.detail;
      const query = direccion && ciudad
        ? `${direccion}, ${ciudad}, Honduras`
        : ciudad
          ? `${ciudad}, Honduras`
          : direccion;
      if (query) setTimeout(() => geocodeQuery(query, direccion ? 16 : 13), 600);
    }
  });
})();


