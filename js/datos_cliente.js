/* ============================================================
   DETALLES DE ENTREGA — VERSIÓN FINAL 2025 (v11)
   Corrección antibucle + loader + validaciones en cadena
============================================================ */

console.log("📦 datos_cliente.js — versión 11 cargado");

// ===================================================================
// 0) ESPERAR A QUE SUPABASE ESTÉ LISTO (Anti-bucle)
// ===================================================================
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) resolve();
    else {
      console.warn("⏳ Esperando Supabase...");
      const interval = setInterval(() => {
        if (window.supabaseClient) {
          clearInterval(interval);
          resolve();
        }
      }, 80);
    }
  });
}

let sb;

/* ----------- CAMPOS ----------- */
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
   3) PINTAR DATOS INSTANTÁNEOS
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
   4) CARGAR DATOS REALES SUPABASE
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
   5) CARGAR DIRECCIÓN
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

  if (zonaSelect.value.trim() !== "") zonaSelect.classList.add("filled");
}

/* ============================================================
   6) VALIDACIÓN EN CADENA (igual Perfil)
============================================================ */
function validarFormularioCadena() {
  if (!nombreInput.value.trim()) return "El nombre es obligatorio.";
  if (!correoInput.value.trim()) return "El correo es obligatorio.";
  if (!telefonoInput.value.trim()) return "El teléfono es obligatorio.";
  if (!ciudadInput.value.trim()) return "La ciudad es obligatoria.";
  if (!zonaSelect.value.trim()) return "Selecciona un departamento.";
  if (!direccionInput.value.trim()) return "La dirección es obligatoria.";
  return null;
}

/* ============================================================
   7) UPDATE USER
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
   9) SUBMIT FINAL
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorMensaje = validarFormularioCadena();
  if (errorMensaje) {
    alert(errorMensaje);
    return;
  }

  btnSubmit.classList.add("loading");

  const okUser = await updateUserBasicInfo();
  if (!okUser) {
    alert("Error actualizando tu información.");
    btnSubmit.classList.remove("loading");
    return;
  }

  const okAddress = await guardarDireccion();
  if (!okAddress) return;

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 600);
});

/* ============================================================
   10) INIT (protección antibucle incluida)
============================================================ */
async function init() {
  await esperarSupabase();
  sb = window.supabaseClient;

  userCache = getUserCache();

  if (!userCache) {
    window.location.href = "login.html";
    return;
  }

  userId = userCache.id;

  pintarDatosInstantaneos();
  cargarDatosRealtime();

  zonaSelect.addEventListener("change", () =>
    zonaSelect.value.trim()
      ? zonaSelect.classList.add("filled")
      : zonaSelect.classList.remove("filled")
  );
}

init();
