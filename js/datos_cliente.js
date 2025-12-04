/* ============================================================
   DETALLES DE ENTREGA — VERSIÓN FINAL 2025
   Compatible con HTML v10 y CSS M3 — Validación estilo PERFIL
============================================================ */

console.log("📦 datos_cliente.js — versión FINAL cargado");

const sb = window.supabaseClient;

// ----------- CAMPOS -----------
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const ciudadInput = document.getElementById("ciudad");
const zonaSelect = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput = document.getElementById("nota");

const form = document.getElementById("cliente-form");
const btnSubmit = document.getElementById("btn-submit");

let userCache = null;
let userId = null;
let loadedAddressId = null;

/* ============================================================
   UTILIDADES DE VALIDACIÓN (IGUAL A PERFIL)
============================================================ */
function marcarError(input) {
  const box = input.closest(".m3-input");
  box.classList.remove("success");
  box.classList.add("error");
}

function marcarSuccess(input) {
  const box = input.closest(".m3-input");
  box.classList.remove("error");
  box.classList.add("success");
}

/* ============================================================
   LEER USUARIO DESDE CACHE
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
   ACTIVAR LABEL FLOTANTE
============================================================ */
function activarLabel(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   MOSTRAR DATOS INSTANTÁNEOS
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

  nombreInput.value = userRow.name || "";
  correoInput.value = userRow.email || "";
  telefonoInput.value = userRow.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);

  localStorage.setItem("cortero_user", JSON.stringify(userRow));
  localStorage.setItem("cortero_logged", "1");

  await cargarDireccion();
}

/* ============================================================
   CARGAR DIRECCIÓN ACTUAL
============================================================ */
async function cargarDireccion() {
  const { data, error } = await sb
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) console.error("❌ Error dirección:", error);
  if (!data) return;

  loadedAddressId = data.id;

  ciudadInput.value = data.city || "";
  zonaSelect.value = data.state || "";
  direccionInput.value = data.street || "";
  notaInput.value = data.postal_code || "";

  activarLabel(ciudadInput);
  activarLabel(direccionInput);
  activarLabel(notaInput);

  // activar floating label en el select
  if (zonaSelect.value.trim() !== "") zonaSelect.classList.add("filled");
}

/* ============================================================
   VALIDACIÓN COMPLETA (SIN ALERTAS)
============================================================ */
function validarCampos() {
  let valido = true;

  if (!nombreInput.value.trim()) { marcarError(nombreInput); valido = false; }
  else marcarSuccess(nombreInput);

  // correo readonly → siempre success
  marcarSuccess(correoInput);

  if (!telefonoInput.value.trim()) { marcarError(telefonoInput); valido = false; }
  else marcarSuccess(telefonoInput);

  if (!ciudadInput.value.trim()) { marcarError(ciudadInput); valido = false; }
  else marcarSuccess(ciudadInput);

  if (!zonaSelect.value.trim()) {
    zonaSelect.closest(".m3-input").classList.add("error");
    zonaSelect.closest(".m3-input").classList.remove("success");
    valido = false;
  } else {
    zonaSelect.closest(".m3-input").classList.remove("error");
    zonaSelect.closest(".m3-input").classList.add("success");
  }

  if (!direccionInput.value.trim()) { marcarError(direccionInput); valido = false; }
  else marcarSuccess(direccionInput);

  // Nota opcional → siempre success
  marcarSuccess(notaInput);

  return valido;
}

/* ============================================================
   ACTUALIZAR DATOS BÁSICOS DEL USUARIO
============================================================ */
async function updateUserBasicInfo() {
  const payload = {
    name: nombreInput.value.trim(),
    phone: telefonoInput.value.trim(),
  };

  const { error } = await sb
    .from("users")
    .update(payload)
    .eq("id", userId);

  if (error) {
    console.error("❌ Error actualizando usuario:", error);
    return false;
  }

  const updated = { ...userCache, ...payload };
  localStorage.setItem("cortero_user", JSON.stringify(updated));
  userCache = updated;

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
    btnSubmit.classList.remove("loading");
    return false;
  }

  return true;
}

/* ============================================================
   SUBMIT FINAL — VALIDACIÓN + LOADER CORRECTO
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const valido = validarCampos();

  // ❌ NO MOSTRAR LOADER SI HAY ERRORES
  if (!valido) return;

  // ✔ SOLO AQUÍ SE MUESTRA EL LOADER
  btnSubmit.classList.add("loading");

  const okUser = await updateUserBasicInfo();
  if (!okUser) {
    btnSubmit.classList.remove("loading");
    return;
  }

  const okAddress = await guardarDireccion();
  if (!okAddress) {
    btnSubmit.classList.remove("loading");
    return;
  }

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 700);
});

/* ============================================================
   INIT
============================================================ */
async function init() {
  userCache = getUserCache();

  if (!userCache) {
    window.location.href = "login.html";
    return;
  }

  userId = userCache.id;

  pintarDatosInstantaneos();
  cargarDatosRealtime();

  zonaSelect.addEventListener("change", () => {
    if (zonaSelect.value.trim() !== "") zonaSelect.classList.add("filled");
    else zonaSelect.classList.remove("filled");
  });
}

init();
