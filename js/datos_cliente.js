/* ============================================================
   DETALLES DE ENTREGA — VERSIÓN FINAL 2025
   Misma lógica que perfil: caché → supabase → pintar labels
============================================================ */

console.log("📦 datos_cliente.js — versión final cargada");

// ----------------------------
// ACCESO SUPERBASE
// ----------------------------
const sb = window.supabaseClient;

// ----------------------------
// CAMPOS DEL FORMULARIO
// ----------------------------
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const ciudadInput = document.getElementById("ciudad");
const zonaSelect = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput = document.getElementById("nota");

const form = document.getElementById("cliente-form");
const btnSubmit = document.getElementById("btn-submit");

// Usuario
let userCache = null;
let userId = null;
let loadedAddressId = null;

/* ============================================================
   1) LEER USUARIO DESDE CACHÉ (OFICIAL: cortero_user)
============================================================ */
function getUserCache() {
  try {
    const logged = localStorage.getItem("cortero_logged");
    if (logged !== "1") return null;

    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

/* ============================================================
   ACTIVAR LABEL FLOTANTE (trigger input)
============================================================ */
function activarLabel(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   2) PINTAR DATOS INSTANTÁNEAMENTE (sin parpadeo)
============================================================ */
function pintarDatosInstantaneos() {
  if (!userCache) return;

  nombreInput.value = userCache.name || "";
  correoInput.value = userCache.email || "";
  telefonoInput.value = userCache.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);
}

/* ============================================================
   3) TRAER DATOS REALES DESDE SUPABASE
============================================================ */
async function cargarDatosRealtime() {
  const { data: userRow, error } = await sb
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("❌ Error cargando usuario:", error);
    return;
  }

  // Actualizar UI
  nombreInput.value = userRow.name || "";
  correoInput.value = userRow.email || "";
  telefonoInput.value = userRow.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);

  // Actualizar caché oficial
  localStorage.setItem("cortero_user", JSON.stringify(userRow));
  localStorage.setItem("cortero_logged", "1");

  // Cargar dirección
  await cargarDireccion();
}

/* ============================================================
   4) CARGAR DIRECCIÓN EXISTENTE
============================================================ */
async function cargarDireccion() {
  const { data, error } = await sb
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    console.error("❌ Error obteniendo dirección:", error);
  }

  if (!data) return;

  loadedAddressId = data.id;

  ciudadInput.value = data.city || "";
  zonaSelect.value = data.state || "";
  direccionInput.value = data.street || "";
  notaInput.value = data.postal_code || "";

  activarLabel(ciudadInput);
  activarLabel(zonaSelect);
  activarLabel(direccionInput);
  activarLabel(notaInput);
}

/* ============================================================
   5) VALIDAR FORMULARIO
============================================================ */
function validarFormulario() {
  if (!nombreInput.value.trim()) return false;
  if (!correoInput.value.trim()) return false;
  if (!telefonoInput.value.trim()) return false;
  if (!ciudadInput.value.trim()) return false;
  if (!zonaSelect.value.trim()) return false;
  if (!direccionInput.value.trim()) return false;
  return true;
}

/* ============================================================
   6) GUARDAR DIRECCIÓN EN SUPABASE
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
    postal_code: notaInput.value.trim(),
    is_default: true,
  };

  let result;

  if (loadedAddressId) {
    result = await sb
      .from("addresses")
      .update(payload)
      .eq("id", loadedAddressId)
      .select()
      .single();
  } else {
    result = await sb
      .from("addresses")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    console.error("❌ Error guardando:", result.error);
    alert("No se pudo guardar tu dirección.");
    btnSubmit.classList.remove("btn-loading");
    return false;
  }

  return true;
}

/* ============================================================
   7) SUBMIT
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validarFormulario()) {
    alert("Por favor completa todos los campos.");
    return;
  }

  btnSubmit.classList.add("btn-loading");

  const ok = await guardarDireccion();
  if (!ok) return;

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 700);
});

/* ============================================================
   8) INICIO
============================================================ */
async function init() {
  userCache = getUserCache();

  if (!userCache) {
    console.warn("⚠ No hay usuario en memoria → login.html");
    window.location.href = "login.html";
    return;
  }

  userId = userCache.id;

  // Pintado instantáneo
  pintarDatosInstantaneos();

  // Cargar datos reales después
  cargarDatosRealtime();
}

init();
