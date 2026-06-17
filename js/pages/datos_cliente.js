console.log("datos_cliente.js — Checkout Iniciado");

function showSnack(msg, duration = 3000) {
  const el = document.getElementById("snackbar");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.classList.add("show");
  setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hidden");
  }, duration);
}

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

/* ============ CAMPOS COMUNES ============ */
const form = document.getElementById("cliente-form");
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const ciudadInput = document.getElementById("ciudad");
const zonaSelect = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput = document.getElementById("nota");
const btnSubmit = document.getElementById("btn-submit-desktop");

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

/* ============ HELPERS ============ */
function getCheckoutCart() {
  try {
    return JSON.parse(localStorage.getItem("checkout_cart")) || [];
  } catch {
    return [];
  }
}

function renderResumen() {
  const cart = getCheckoutCart();
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
  const finalTotal = totalConDescuentoItems;

  sumSubtotalEl.textContent = `L ${subtotalOriginal.toFixed(2)}`;
  sumShippingEl.textContent = `Gratis`;
  if (ahorroItems > 0) {
    sumDiscountRow.classList.remove("hidden");
    sumDiscountAmount.textContent = `- L ${ahorroItems.toFixed(2)}`;
  } else {
    sumDiscountRow.classList.add("hidden");
  }
  sumTotalEl.textContent = `L ${finalTotal.toFixed(2)}`;
  summaryCouponBox.classList.add("hidden");
}

/* ============ FLUJO NORMAL (NO ADMIN) ============ */
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
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

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
  activarLabel(nombreInput); activarLabel(correoInput); activarLabel(telefonoInput);
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
  activarLabel(ciudadInput); activarLabel(direccionInput); activarLabel(zonaSelect);
  window.dispatchEvent(new CustomEvent("cortero:direccionCargada", {
    detail: { ciudad: addr.city || "", direccion: addr.street || "" }
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
  sessionStorage.setItem("checkout_shipping_method", "gratis");
  setTimeout(() => window.location.href = "/pages/shop/recibo.html", 800);
});

/* ============ FLUJO POS ADMIN ============ */
let selectedClient = null;
let posSelectedPayment = null;

function initAdminPOS() {
  document.getElementById("customer-form-section").classList.add("hidden");
  document.getElementById("map-section")?.classList.add("hidden");
  document.getElementById("admin-pos-section").classList.remove("hidden");
  const submitBtn = document.getElementById("btn-submit-desktop");
  if (submitBtn) submitBtn.style.display = "none";

  const searchInput = document.getElementById("pos-search-input");
  const resultsEl = document.getElementById("pos-search-results");
  const selectedEl = document.getElementById("pos-selected-client");
  const newForm = document.getElementById("pos-new-client-form");
  const searchSection = document.getElementById("pos-search-section");
  const continuarBtn = document.getElementById("pos-continuar-btn");
  const stepConfirmar = document.getElementById("pos-step-confirmar");
  const btnNuevo = document.getElementById("pos-btn-nuevo");
  const btnExistente = document.getElementById("pos-btn-existente");
  const btnRapida = document.getElementById("pos-btn-rapida");
  const createBtn = document.getElementById("pos-create-client-btn");

  let searchTimer = null;

  function activarModoNuevo() {
    btnNuevo.classList.add("active");
    btnExistente.classList.remove("active");
    btnRapida.classList.remove("active");
    searchSection.classList.add("hidden");
    newForm.classList.remove("hidden");
    createBtn.classList.remove("hidden");
    restaurarModoComun();
  }

  function restaurarModoComun() {
    document.getElementById("pos-selected-header").innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>Cliente seleccionado:</span>
    `;
    document.getElementById("pos-change-client-btn").classList.remove("hidden");
  }

  function activarModoExistente() {
    btnExistente.classList.add("active");
    btnNuevo.classList.remove("active");
    btnRapida.classList.remove("active");
    newForm.classList.add("hidden");
    searchSection.classList.remove("hidden");
    searchInput.focus();
    createBtn.classList.add("hidden");
    restaurarModoComun();
  }

  function activarModoRapida() {
    btnRapida.classList.add("active");
    btnNuevo.classList.remove("active");
    btnExistente.classList.remove("active");
    newForm.classList.add("hidden");
    searchSection.classList.add("hidden");
    selectedEl.classList.add("hidden");
    createBtn.classList.add("hidden");
    const admin = JSON.parse(localStorage.getItem("cortero_user") || "{}");
    selectedClient = { id: admin.id, name: `${admin.name} (Venta rápida)`, phone: null, email: null };
    document.getElementById("pos-client-info").innerHTML = `
      <div class="info-row"><span class="info-label">Atendido por:</span><span>${admin.name}</span></div>
    `;
    document.getElementById("pos-selected-header").innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>Venta sin cliente registrado</span>
    `;
    document.getElementById("pos-change-client-btn").classList.add("hidden");
    selectedEl.classList.remove("hidden");
    continuarBtn.classList.remove("hidden");
    stepConfirmar.classList.add("hidden");
  }

  btnRapida.onclick = activarModoRapida;
  btnNuevo.onclick = activarModoNuevo;
  btnExistente.onclick = activarModoExistente;
  activarModoRapida();

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (q.length < 2) {
      resultsEl.classList.add("hidden");
      return;
    }
    searchTimer = setTimeout(() => buscarClientes(q), 300);
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length >= 2) {
      resultsEl.classList.remove("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pos-search-box")) {
      resultsEl.classList.add("hidden");
    }
  });

  async function buscarClientes(query) {
    const sb = window.supabaseClient;
    const q = query.toLowerCase();
    const { data } = await sb
      .from("users")
      .select("id, name, email, phone, rol")
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .neq("rol", "admin");
    renderResults(data || []);
  }

  function renderResults(users) {
    resultsEl.innerHTML = "";
    if (users.length === 0) {
      resultsEl.innerHTML = `<div class="pos-no-results">
        <span class="material-symbols-outlined">person_off</span>
        No se encontraron clientes.
      </div>`;
      resultsEl.classList.remove("hidden");
      return;
    }
    users.forEach(u => {
      const div = document.createElement("div");
      div.className = "pos-search-result-item";
      div.innerHTML = `
        <span class="material-symbols-outlined result-icon">person</span>
        <div>
          <div class="result-name">${u.name || "Sin nombre"}</div>
          <div class="result-detail">${[u.phone, u.email].filter(Boolean).join(" · ") || "Sin contacto"}</div>
        </div>
      `;
      div.onclick = () => seleccionarCliente(u);
      resultsEl.appendChild(div);
    });
    resultsEl.classList.remove("hidden");
  }

  function seleccionarCliente(user) {
    selectedClient = user;
    resultsEl.classList.add("hidden");
    searchSection.classList.add("hidden");
    newForm.classList.add("hidden");
    searchInput.value = "";
    createBtn.classList.add("hidden");

    selectedEl.classList.remove("hidden");
    document.getElementById("pos-client-info").innerHTML = `
      <div class="info-row"><span class="info-label">Nombre:</span><span>${user.name || "—"}</span></div>
      <div class="info-row"><span class="info-label">Teléfono:</span><span>${user.phone || "—"}</span></div>
      <div class="info-row"><span class="info-label">Correo:</span><span>${user.email || "—"}</span></div>
    `;
    continuarBtn.classList.remove("hidden");
  }

  document.getElementById("pos-change-client-btn").onclick = () => {
    selectedClient = null;
    selectedEl.classList.add("hidden");
    continuarBtn.classList.add("hidden");
    stepConfirmar.classList.add("hidden");
    createBtn.classList.add("hidden");
    activarModoExistente();
  };

  // Crear nuevo cliente
  createBtn.onclick = async () => {
    const name = document.getElementById("pos-new-name").value.trim();
    if (!name) { showSnack("El nombre es obligatorio"); return; }
    const phone = document.getElementById("pos-new-phone").value.trim();
    const email = document.getElementById("pos-new-email").value.trim();

    const sb = window.supabaseClient;

    const signUpEmail = email || `pos_${Date.now()}@cafecortero.pos`;
    const { data: signUpData, error: signUpErr } = await sb.auth.signUp({
      email: signUpEmail,
      password: Math.random().toString(36).slice(2, 10),
      options: { data: { name, phone, rol: "cliente" } }
    });
    if (signUpErr) { showSnack("Error al crear el cliente"); return; }
    const newUserId = signUpData.user?.id;
    if (!newUserId) { showSnack("Error al crear el cliente"); return; }

    sessionStorage.setItem("pos_client", JSON.stringify({
      id: newUserId, name, phone: phone || null, email: email || null
    }));
    window.location.href = "/pages/shop/recibo.html";
  };

  // Continuar → guardar cliente y redirigir a recibo.html
  continuarBtn.onclick = () => {
    sessionStorage.setItem("pos_client", JSON.stringify({
      id: selectedClient.id,
      name: selectedClient.name,
      phone: selectedClient.phone,
      email: selectedClient.email
    }));
    window.location.href = "/pages/shop/recibo.html";
  };
}

/* ============ INIT PRINCIPAL ============ */
(async function init() {
  await esperarSupabase();
  userCache = JSON.parse(localStorage.getItem("cortero_user"));
  if (!userCache) return window.location.href = "/pages/auth/login.html";
  userId = userCache.id;
  renderResumen();

  const isAdmin = String(userCache.rol || "").toLowerCase() === "admin";

  if (isAdmin) {
    initAdminPOS();
  } else {
    await cargarDatosRealtime();
    [nombreInput, telefonoInput, ciudadInput, direccionInput, zonaSelect].forEach(el => {
      el.addEventListener("input", () => limpiarError(el));
    });
  }
})();

/* ============ MAPA (solo para no-admin) ============ */
(function initMap() {
  if (typeof L === "undefined") {
    window.addEventListener("load", initMap);
    return;
  }
  const HONDURAS_CENTER = [14.0, -86.58];
  const INITIAL_ZOOM = 7;
  const map = L.map("delivery-map", {
    center: HONDURAS_CENTER,
    zoom: INITIAL_ZOOM,
    zoomControl: true,
    scrollWheelZoom: false
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  const greenIcon = L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;background:#2e7d32;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 12px rgba(46,125,50,0.4);"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36]
  });

  let marker = null;
  const statusEl = document.getElementById("map-status");
  function setStatus(msg, type = "") {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "map-status" + (type ? ` ${type}` : "");
    if (!msg) statusEl.classList.add("hidden");
  }
  function setMarker(lat, lng, popupText) {
    if (marker) { marker.setLatLng([lat, lng]); }
    else { marker = L.marker([lat, lng], { icon: greenIcon, draggable: true }).addTo(map); }
    if (popupText) marker.bindPopup(`<b> Punto de entrega</b><br>${popupText}`).openPopup();
    sessionStorage.setItem("delivery_lat", lat);
    sessionStorage.setItem("delivery_lng", lng);
  }

  async function reverseGeocode(lat, lng) {
    setStatus("Obteniendo dirección...", "searching");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "es" } });
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address;
        const parts = [addr.road || addr.pedestrian || addr.footway, addr.house_number, addr.neighbourhood || addr.suburb, addr.city || addr.town || addr.village].filter(Boolean);
        const shortAddr = parts.length > 0 ? parts.join(", ") : data.display_name;
        direccionInput.value = shortAddr;
        direccionInput.dispatchEvent(new Event("input", { bubbles: true }));
        setMarker(lat, lng, shortAddr);
        setStatus("Dirección actualizada");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch { setStatus("No se pudo obtener la dirección.", "error"); setTimeout(() => setStatus(""), 4000); }
  }

  map.on("click", async (e) => {
    const { lat, lng } = e.latlng;
    setMarker(lat, lng, null);
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15));
    await reverseGeocode(lat, lng);
  });

  let debounceTimer = null;
  function buildQuery() {
    const ciudad = ciudadInput.value.trim();
    const dir = direccionInput.value.trim();
    if (dir.length >= 4 && ciudad.length >= 2) return { query: `${dir}, ${ciudad}, Honduras`, zoom: 16 };
    if (ciudad.length >= 3) return { query: `${ciudad}, Honduras`, zoom: 13 };
    return null;
  }
  async function geocodeQuery(query, zoom) {
    if (!query) return;
    setStatus("Buscando en el mapa...", "searching");
    try {
      const q = encodeURIComponent(query);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=hn`,
        { headers: { "Accept-Language": "es" } });
      const data = await res.json();
      if (data && data.length > 0) {
        map.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], zoom, { animate: true, duration: 1.2 });
        setMarker(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
        setStatus("Ubicación encontrada");
        setTimeout(() => setStatus(""), 3000);
      } else { setStatus("No se encontró.", "error"); setTimeout(() => setStatus(""), 4000); }
    } catch { setStatus("Error al buscar.", "error"); setTimeout(() => setStatus(""), 4000); }
  }

  if (ciudadInput) {
    ciudadInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const result = buildQuery();
      if (result) debounceTimer = setTimeout(() => geocodeQuery(result.query, result.zoom), 900);
    });
  }

  const direccionEl = document.getElementById("direccion");
  const suggestionsList = document.getElementById("direccion-suggestions");
  let isSelecting = false;

  function hideSuggestions() { if (suggestionsList) suggestionsList.classList.add("hidden"); }

  function showSuggestions(results) {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = "";
    if (!results || results.length === 0) { hideSuggestions(); return; }
    results.forEach(item => {
      const addr = item.address || {};
      const mainParts = [item.name || addr.road || addr.pedestrian || addr.amenity || addr.building, addr.house_number].filter(Boolean);
      const main = mainParts.join(" ") || item.display_name.split(",")[0];
      const subParts = [addr.neighbourhood || addr.suburb || addr.quarter, addr.city || addr.town || addr.village || addr.municipality].filter(Boolean);
      const sub = subParts.join(", ") || "";
      const li = document.createElement("li");
      li.innerHTML = `<span class="material-symbols-outlined sug-icon">location_on</span><div class="sug-text"><div class="sug-main">${main}</div>${sub ? `<div class="sug-sub">${sub}</div>` : ""}</div>`;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isSelecting = true;
        direccionEl.value = [main, sub].filter(Boolean).join(", ");
        map.flyTo([parseFloat(item.lat), parseFloat(item.lon)], 17, { animate: true, duration: 1.2 });
        setMarker(parseFloat(item.lat), parseFloat(item.lon), [main, sub].filter(Boolean).join(", "));
        setStatus("Dirección seleccionada");
        setTimeout(() => setStatus(""), 3000);
        hideSuggestions();
        setTimeout(() => { isSelecting = false; }, 300);
      });
      suggestionsList.appendChild(li);
    });
    suggestionsList.classList.remove("hidden");
  }

  async function fetchSuggestions(query) {
    if (!query || query.length < 4) { hideSuggestions(); return; }
    const ciudadVal = ciudadInput.value.trim();
    const q = encodeURIComponent(query + (ciudadVal ? `, ${ciudadVal}` : "") + ", Honduras");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=hn&addressdetails=1`,
        { headers: { "Accept-Language": "es" } });
      const data = await res.json();
      if (direccionEl === document.activeElement && direccionEl.value.trim().length >= 4) showSuggestions(data);
    } catch { hideSuggestions(); }
  }

  if (direccionEl) {
    direccionEl.addEventListener("input", () => {
      if (isSelecting) return;
      clearTimeout(debounceTimer);
      const val = direccionEl.value.trim();
      if (val.length >= 4) debounceTimer = setTimeout(() => fetchSuggestions(val), 600);
      else hideSuggestions();
    });
    direccionEl.addEventListener("focus", () => {
      const val = direccionEl.value.trim();
      if (val.length >= 4 && !isSelecting) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchSuggestions(val), 400);
      }
    });
    direccionEl.addEventListener("blur", () => { setTimeout(() => { if (!isSelecting) hideSuggestions(); }, 250); });
    direccionEl.addEventListener("keydown", (e) => { if (e.key === "Escape") hideSuggestions(); });
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".m3-field")) hideSuggestions(); });

  const btnGps = document.getElementById("btn-gps");
  if (btnGps) {
    btnGps.addEventListener("click", () => {
      if (!navigator.geolocation) { setStatus("Tu navegador no soporta geolocalización.", "error"); return; }
      btnGps.classList.add("loading-gps");
      btnGps.querySelector(".material-symbols-outlined").textContent = "sync";
      setStatus("Obteniendo tu ubicación...", "searching");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true, duration: 1.5 });
          setMarker(pos.coords.latitude, pos.coords.longitude, null);
          await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          btnGps.classList.remove("loading-gps");
          btnGps.querySelector(".material-symbols-outlined").textContent = "my_location";
        },
        () => {
          setStatus("No se pudo obtener tu ubicación.", "error");
          setTimeout(() => setStatus(""), 4000);
          btnGps.classList.remove("loading-gps");
          btnGps.querySelector(".material-symbols-outlined").textContent = "my_location";
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }
})();
