/* ============================================================
   DATOS DEL CLIENTE — VERSIÓN FINAL 2025
   Igual lógica que perfil.js: carga instantánea desde caché,
   luego refresca desde Supabase y guarda dirección.
============================================================ */

console.log("📦 datos_cliente.js cargado correctamente.");

const sb = window.supabaseClient;

// Inputs
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const ciudadInput = document.getElementById("ciudad");
const zonaSelect = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput = document.getElementById("nota");
const form = document.getElementById("cliente-form");
const btnSubmit = document.getElementById("btn-submit");

let currentUser = null;
let currentUserId = null;
let loadedAddressId = null;

/* ============================================================
   1) LEER DATOS GUARDADOS POR LOGIN (instantáneo, como perfil)
============================================================ */
function getUserProfileFromCache() {
  try {
    const json = localStorage.getItem("cc_user_profile");
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function pintarDatosInstantaneos() {
  if (!currentUser) return;

  nombreInput.value = currentUser.name || "";
  correoInput.value = currentUser.email || "";
  telefonoInput.value = currentUser.phone || "";
}

/* ============================================================
   2) CARGAR DATOS REALES DESDE SUPABASE
============================================================ */
async function cargarDatosDesdeSupabase() {
  const { data: userRow, error } = await sb
    .from("users")
    .select("*")
    .eq("id", currentUserId)
    .single();

  if (error) {
    console.error("❌ Error cargando usuario desde Supabase:", error);
    return;
  }

  // Actualizar inputs
  nombreInput.value = userRow.name || "";
  correoInput.value = userRow.email || "";
  telefonoInput.value = userRow.phone || "";

  // Guardar nueva versión en caché
  localStorage.setItem("cc_user_profile", JSON.stringify(userRow));

  // Cargar dirección
  await cargarDireccion();
}

/* ============================================================
   3) CARGAR DIRECCIÓN DEL USUARIO
============================================================ */
async function cargarDireccion() {
  const { data, error } = await sb
    .from("addresses")
    .select("*")
    .eq("user_id", currentUserId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    console.error("❌ Error cargando dirección:", error);
    return;
  }

  if (!data) {
    console.log("ℹ No existe dirección previa.");
    return;
  }

  loadedAddressId = data.id;

  ciudadInput.value = data.city || "";
  zonaSelect.value = data.state || "";
  direccionInput.value = data.street || "";
  notaInput.value = data.postal_code || "";
}

/* ============================================================
   4) VALIDACIÓN
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
   5) GUARDAR DIRECCIÓN
============================================================ */
async function guardarDireccion() {
  const payload = {
    user_id: currentUserId,
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
    console.log("✏ Actualizando dirección...");
    result = await sb
      .from("addresses")
      .update(payload)
      .eq("id", loadedAddressId)
      .select()
      .single();
  } else {
    console.log("➕ Insertando nueva dirección...");
    result = await sb
      .from("addresses")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    console.error("❌ Error guardando dirección:", result.error);
    alert("Ocurrió un error al guardar tu dirección.");
    btnSubmit.classList.remove("btn-loading");
    return false;
  }

  return true;
}

/* ============================================================
   6) SUBMIT
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validarFormulario()) {
    alert("Por favor completa todos los campos obligatorios.");
    return;
  }

  btnSubmit.classList.add("btn-loading");

  const ok = await guardarDireccion();
  if (!ok) return;

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 800);
});

/* ============================================================
   INICIO
============================================================ */
async function init() {
  // Obtener usuario del login (misma lógica de perfil)
  currentUser = getUserProfileFromCache();

  if (!currentUser) {
    console.warn("⚠ No hay usuario cacheado. Redirigiendo.");
    window.location.href = "login.html";
    return;
  }

  currentUserId = currentUser.id;

  // Pintado inmediato
  pintarDatosInstantaneos();

  // Luego refresca desde Supabase
  cargarDatosDesdeSupabase();
}

init();
