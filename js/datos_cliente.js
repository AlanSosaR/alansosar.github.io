/* ============================================================
   DETALLES DE ENTREGA — VERSIÓN FINAL 2025
   Igual que perfil: cache → supabase → actualizar user + dirección
============================================================ */

console.log("📦 datos_cliente.js — versión final cargada");

// ----------------------------
// ACCESO SUPABASE
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
   LEER USUARIO DESDE CACHE (OFICIAL)
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
   LABEL FLOTANTE (TRIGGER)
============================================================ */
function activarLabel(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   PINTAR DATOS INSTANTANEOS (SIN PARPADEO)
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
   CARGAR DATOS REALES DESDE SUPABASE
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

  // Actualizar inputs
  nombreInput.value = userRow.name || "";
  correoInput.value = userRow.email || "";
  telefonoInput.value = userRow.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);

  // Actualizar cache
  localStorage.setItem("cortero_user", JSON.stringify(userRow));
  localStorage.setItem("cortero_logged", "1");

  // Cargar dirección
  await cargarDireccion();
}

/* ============================================================
   CARGAR DIRECCIÓN EXISTENTE
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
   VALIDAR FORMULARIO
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
   ACTUALIZAR DATOS BÁSICOS DEL USUARIO EN "users"
============================================================ */
async function updateUserBasicInfo() {
  const payload = {
    name: nombreInput.value.trim(),
    phone: telefonoInput.value.trim()
  };

  const { error } = await sb
    .from("users")
    .update(payload)
    .eq("id", userId);

  if (error) {
    console.error("❌ Error actualizando usuario:", error);
    return false;
  }

  // Actualizar cache
  const updatedUser = {
    ...userCache,
    name: payload.name,
    phone: payload.phone
  };

  localStorage.setItem("cortero_user", JSON.stringify(updatedUser));
  userCache = updatedUser;

  return true;
}

/* ============================================================
   GUARDAR DIRECCIÓN EN SUPABASE
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
    console.error("❌ Error guardando dirección:", result.error);
    alert("No se pudo guardar tu dirección.");
    btnSubmit.classList.remove("loading");
    return false;
  }

  return true;
}

/* ============================================================
   SUBMIT FINAL
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validarFormulario()) {
    alert("Por favor completa todos los campos.");
    return;
  }

  btnSubmit.classList.add("loading");

  // 1️⃣ Guardar datos del usuario
  const okUser = await updateUserBasicInfo();
  if (!okUser) {
    alert("Error actualizando datos del usuario.");
    btnSubmit.classList.remove("loading");
    return;
  }

  // 2️⃣ Guardar dirección
  const okAddress = await guardarDireccion();
  if (!okAddress) return;

  // 3️⃣ Redirigir
  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 700);
});

/* ============================================================
   INICIO
============================================================ */
async function init() {
  userCache = getUserCache();

  if (!userCache) {
    console.warn("⚠ No hay usuario → login");
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
