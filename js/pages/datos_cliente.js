/* ============================================================
   📦 datos_cliente.js — FINAL CORREGIDO (Material 3)
============================================================ */

console.log("📦 datos_cliente.js — FINAL Sincronizado");

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
   CAMPOS
============================================================ */
const form = document.getElementById("cliente-form");

const nombreInput    = document.getElementById("nombre");
const correoInput    = document.getElementById("correo");
const telefonoInput  = document.getElementById("telefono");
const ciudadInput    = document.getElementById("ciudad");
const zonaSelect     = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput      = document.getElementById("nota");

const btnSubmit = document.getElementById("btn-submit");

let userCache = null;
let userId = null;
let loadedAddressId = null;

/* ============================================================
   UI — ERRORES MATERIAL 3 (CORRECTO)
============================================================ */
function mostrarError(input, mensaje) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box   = field.querySelector(".m3-input");
  const label = field.querySelector(".floating-label");

  field.classList.add("filled");

  let helper = field.querySelector(".helper-text");
  if (!helper) {
    helper = document.createElement("div");
    helper.className = "helper-text";
    field.appendChild(helper);
  }

  field.classList.add("error");
  box.classList.add("error");
  if (label) label.style.color = "#B3261E";

  helper.textContent = mensaje;
}

function limpiarError(input) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box    = field.querySelector(".m3-input");
  const label  = field.querySelector(".floating-label");
  const helper = field.querySelector(".helper-text");

  field.classList.remove("error");
  box.classList.remove("error");

  if (!input.value.trim()) {
    field.classList.remove("filled");
  }

  if (label) label.style.color = "";
  if (helper) helper.textContent = "";
}

/* ============================================================
   CHECKOUT CART (VALIDACIÓN)
============================================================ */
const CHECKOUT_KEY = "checkout_cart";

function getCheckoutCart() {
  try {
    return JSON.parse(localStorage.getItem(CHECKOUT_KEY)) || [];
  } catch {
    return [];
  }
}

function validarCheckoutCart() {
  const cart = getCheckoutCart();
  if (!cart.length) {
    window.location.href = "carrito.html";
    return false;
  }
  const invalid = cart.some(p => !p.product_id);
  if (invalid) {
    window.location.href = "carrito.html";
    return false;
  }
  return true;
}

/* ============================================================
   CACHE USUARIO
============================================================ */
function getUserCache() {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

/* ============================================================
   ACTIVAR LABEL (Material 3)
============================================================ */
function activarLabel(input) {
  if (input.value.trim() !== "") {
    input.closest(".m3-field")?.classList.add("filled");
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   PINTAR DATOS DESDE CACHE
============================================================ */
function pintarDatosInstantaneos() {
  if (!userCache) return;
  nombreInput.value   = userCache.name  || "";
  correoInput.value   = userCache.email || "";
  telefonoInput.value = userCache.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);
}

/* ============================================================
   CARGAR DATOS DESDE BD
============================================================ */
async function cargarDatosRealtime() {
  const { data } = await window.supabaseClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!data) return;

  nombreInput.value   = data.name  || "";
  correoInput.value   = data.email || "";
  telefonoInput.value = data.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);

  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");

  await cargarDireccion();
}

/* ============================================================
   DIRECCIÓN (CORREGIDO: NOTA NO SE CARGA DE POSTAL_CODE)
============================================================ */
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

  ciudadInput.value    = addr.city || "";
  zonaSelect.value     = addr.state || "";
  direccionInput.value = addr.street || "";
  
  // 💡 CLAVE: La nota siempre empieza vacía para un nuevo pedido
  notaInput.value = ""; 

  activarLabel(ciudadInput);
  activarLabel(direccionInput);
  activarLabel(notaInput);

  if (zonaSelect.value) zonaSelect.classList.add("filled");
}

/* ============================================================
   VALIDACIÓN FINAL (SOLO EN SUBMIT)
============================================================ */
function validarFormulario() {
  let ok = true;
  if (!nombreInput.value.trim()) { mostrarError(nombreInput, "El nombre es obligatorio"); ok = false; }
  if (!correoInput.value.trim()) { mostrarError(correoInput, "El correo es obligatorio"); ok = false; }
  if (!telefonoInput.value.trim()) { mostrarError(telefonoInput, "El teléfono es obligatorio"); ok = false; }
  if (!ciudadInput.value.trim()) { mostrarError(ciudadInput, "La ciudad es obligatoria"); ok = false; }
  if (!zonaSelect.value.trim()) { mostrarError(zonaSelect, "Selecciona un departamento"); ok = false; }
  if (!direccionInput.value.trim()) { mostrarError(direccionInput, "La dirección es obligatoria"); ok = false; }
  return ok;
}

/* ============================================================
   GUARDAR USUARIO
============================================================ */
async function updateUser() {
  const { error } = await window.supabaseClient
    .from("users")
    .update({ name: nombreInput.value.trim(), phone: telefonoInput.value.trim() })
    .eq("id", userId);
  return !error;
}

/* ============================================================
   GUARDAR DIRECCIÓN (CORREGIDO: POSTAL_CODE VACÍO)
============================================================ */
async function guardarDireccion() {
  const payload = {
    user_id: userId,
    full_name: nombreInput.value.trim(),
    phone: telefonoInput.value.trim(),
    country: "Honduras",
    state: zonaSelect.value.trim(),
    city: ciudadInput.value.trim(),
    street: direccionInput.value.trim(),
    postal_code: "", // Ya no guardamos la nota aquí permanentemente
    is_default: true
  };

  const res = loadedAddressId
    ? await window.supabaseClient.from("addresses").update(payload).eq("id", loadedAddressId)
    : await window.supabaseClient.from("addresses").insert(payload);

  return !res.error;
}

/* ============================================================
   SUBMIT (FINAL BLINDADO)
============================================================ */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!validarFormulario()) return;
  if (!validarCheckoutCart()) return;

  btnSubmit.classList.add("loading");

  const userOk = await updateUser();
  const addrOk = await guardarDireccion();

  if (!userOk || !addrOk) {
    btnSubmit.classList.remove("loading");
    alert("Error al guardar información.");
    return;
  }

  // 🔑 PERSISTENCIA DE NOTA: Guardar para usarla en el INSERT de la tabla 'orders'
  sessionStorage.setItem("current_order_notes", notaInput.value.trim());

  setTimeout(() => window.location.href = "recibo.html", 600);
});

/* ============================================================
   INIT
============================================================ */
(async function init() {
  await esperarSupabase();

  userCache = getUserCache();
  if (!userCache) return window.location.href = "login.html";

  if (!validarCheckoutCart()) return;

  userId = userCache.id;

  pintarDatosInstantaneos();
  cargarDatosRealtime();

  [nombreInput, telefonoInput, ciudadInput, direccionInput, notaInput].forEach(el =>
    el.addEventListener("input", () => limpiarError(el))
  );

  zonaSelect.addEventListener("change", () => {
    limpiarError(zonaSelect);
    zonaSelect.value ? zonaSelect.classList.add("filled") : zonaSelect.classList.remove("filled");
  });
})();
