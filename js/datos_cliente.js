/* ============================================================
   DETALLES DE ENTREGA — VERSIÓN FINAL 2025 (v11 UI FIX)
   ✔ Errores debajo del campo
   ✔ Sin alert()
   ✔ Labels rojos Material 3
============================================================ */

console.log("📦 datos_cliente.js — versión 11 UI FIX cargado");

// ===================================================================
// 0) ESPERAR A QUE SUPABASE ESTÉ LISTO (Anti-bucle)
// ===================================================================
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) resolve();
    else {
      const interval = setInterval(() => {
        if (window.supabaseClient) {
          clearInterval(interval);
          resolve();
        }
      }, 80);
    }
  });
}

/* ----------- CAMPOS ----------- */
const nombreInput    = document.getElementById("nombre");
const correoInput    = document.getElementById("correo");
const telefonoInput  = document.getElementById("telefono");
const ciudadInput    = document.getElementById("ciudad");
const zonaSelect     = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput      = document.getElementById("nota");

const form      = document.getElementById("cliente-form");
const btnSubmit = document.getElementById("btn-submit");

let userCache = null;
let userId = null;
let loadedAddressId = null;

/* ============================================================
   UI — ERRORES MATERIAL 3
============================================================ */
function mostrarError(input, mensaje) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const label = field.querySelector(".floating-label");
  const box   = field.querySelector(".m3-input");

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

  const label  = field.querySelector(".floating-label");
  const box    = field.querySelector(".m3-input");
  const helper = field.querySelector(".helper-text");

  field.classList.remove("error");
  box.classList.remove("error");
  if (label) label.style.color = "";
  if (helper) helper.textContent = "";
}

/* ============================================================
   1) LEER USUARIO DESDE CACHE
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
   2) ACTIVAR LABEL
============================================================ */
function activarLabel(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ============================================================
   3) PINTAR DATOS INSTANTÁNEOS (CACHE)
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
   4) CARGAR DATOS REALES DESDE SUPABASE
============================================================ */
async function cargarDatosRealtime() {
  const { data: userRow, error } =
    await window.supabaseClient
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

  if (error) return;

  nombreInput.value   = userRow.name  || "";
  correoInput.value   = userRow.email || "";
  telefonoInput.value = userRow.phone || "";

  activarLabel(nombreInput);
  activarLabel(correoInput);
  activarLabel(telefonoInput);

  localStorage.setItem("cortero_user", JSON.stringify(userRow));
  localStorage.setItem("cortero_logged", "1");

  await cargarDireccion();
}

/* ============================================================
   5) CARGAR DIRECCIÓN
============================================================ */
async function cargarDireccion() {
  const { data } =
    await window.supabaseClient
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

  if (!data || !data.length) return;

  const address = data[0];
  loadedAddressId = address.id;

  ciudadInput.value    = address.city || "";
  zonaSelect.value     = address.state || "";
  direccionInput.value = address.street || "";
  notaInput.value      = address.postal_code || "";

  activarLabel(ciudadInput);
  activarLabel(direccionInput);
  activarLabel(notaInput);

  if (zonaSelect.value.trim()) zonaSelect.classList.add("filled");
}

/* ============================================================
   6) VALIDACIÓN EN CADENA (UI)
============================================================ */
function validarFormularioCadena() {
  limpiarTodosErrores();

  if (!nombreInput.value.trim()) {
    mostrarError(nombreInput, "El nombre es obligatorio");
    return false;
  }

  if (!correoInput.value.trim()) {
    mostrarError(correoInput, "El correo es obligatorio");
    return false;
  }

  if (!telefonoInput.value.trim()) {
    mostrarError(telefonoInput, "El teléfono es obligatorio");
    return false;
  }

  if (!ciudadInput.value.trim()) {
    mostrarError(ciudadInput, "La ciudad es obligatoria");
    return false;
  }

  if (!zonaSelect.value.trim()) {
    mostrarError(zonaSelect, "Selecciona un departamento");
    return false;
  }

  if (!direccionInput.value.trim()) {
    mostrarError(direccionInput, "La dirección es obligatoria");
    return false;
  }

  return true;
}

function limpiarTodosErrores() {
  [
    nombreInput,
    correoInput,
    telefonoInput,
    ciudadInput,
    zonaSelect,
    direccionInput,
    notaInput
  ].forEach(el => el && limpiarError(el));
}

/* ============================================================
   7) UPDATE USER
============================================================ */
async function updateUserBasicInfo() {
  const { error } =
    await window.supabaseClient
      .from("users")
      .update({
        name: nombreInput.value.trim(),
        phone: telefonoInput.value.trim()
      })
      .eq("id", userId);

  if (error) return false;

  userCache = { ...userCache, name: nombreInput.value.trim(), phone: telefonoInput.value.trim() };
  localStorage.setItem("cortero_user", JSON.stringify(userCache));

  return true;
}

/* ============================================================
   8) GUARDAR DIRECCIÓN
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

  const result = loadedAddressId
    ? await window.supabaseClient.from("addresses").update(payload).eq("id", loadedAddressId)
    : await window.supabaseClient.from("addresses").insert(payload);

  return !result.error;
}

/* ============================================================
   9) SUBMIT FINAL
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validarFormularioCadena()) return;

  btnSubmit.classList.add("loading");

  if (!await updateUserBasicInfo()) {
    btnSubmit.classList.remove("loading");
    return;
  }

  if (!await guardarDireccion()) {
    btnSubmit.classList.remove("loading");
    return;
  }

  setTimeout(() => window.location.href = "recibo.html", 600);
});

/* ============================================================
   10) INIT
============================================================ */
async function init() {
  await esperarSupabase();

  userCache = getUserCache();
  if (!userCache) {
    window.location.href = "login.html";
    return;
  }

  userId = userCache.id;

  pintarDatosInstantaneos();
  cargarDatosRealtime();

  [
    nombreInput,
    telefonoInput,
    ciudadInput,
    direccionInput,
    notaInput
  ].forEach(el => el && el.addEventListener("input", () => limpiarError(el)));

  zonaSelect.addEventListener("change", () => {
    limpiarError(zonaSelect);
    zonaSelect.value.trim()
      ? zonaSelect.classList.add("filled")
      : zonaSelect.classList.remove("filled");
  });
}

init();
