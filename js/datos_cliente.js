/* ============================================================
   DATOS DEL CLIENTE — VERSIÓN FINAL 2025
   Autocompleta datos, carga dirección, valida y guarda.
   Dependencias: supabase-client.js y core-scripts.js
============================================================ */

console.log("📦 datos_cliente.js cargado correctamente.");

const sb = window.supabaseClient; // conexión que ya existe

// Campos del formulario
const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const ciudadInput = document.getElementById("ciudad");
const zonaSelect = document.getElementById("zona");
const direccionInput = document.getElementById("direccion");
const notaInput = document.getElementById("nota");
const form = document.getElementById("cliente-form");
const btnSubmit = document.getElementById("btn-submit");

let currentUserId = null;
let loadedAddressId = null;

/* ============================================================
   1) CARGAR USUARIO ACTIVO
============================================================ */
async function cargarUsuario() {
  const { data: sessionData } = await sb.auth.getSession();

  if (!sessionData || !sessionData.session) {
    console.warn("⚠ No hay sesión. Esto debería venir validado desde el carrito.");
    window.location.href = "login.html";
    return;
  }

  const user = sessionData.session.user;
  currentUserId = user.id;

  console.log("👤 Usuario autenticado:", currentUserId);

  // Traer datos desde tabla users
  const { data: userRow, error } = await sb
    .from("users")
    .select("*")
    .eq("id", currentUserId)
    .single();

  if (error) {
    console.error("❌ Error cargando datos del usuario:", error);
    return;
  }

  nombreInput.value = userRow.name || "";
  correoInput.value = userRow.email || "";
  telefonoInput.value = userRow.phone || "";

  // Cargar dirección si existe
  cargarDireccionUsuario();
}

/* ============================================================
   2) CARGAR DIRECCIÓN ANTERIOR
============================================================ */
async function cargarDireccionUsuario() {
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
    console.log("ℹ No había dirección previa.");
    return;
  }

  loadedAddressId = data.id;

  ciudadInput.value = data.city || "";
  zonaSelect.value = data.state || "";
  direccionInput.value = data.street || "";
  notaInput.value = data.postal_code || "";
}

/* ============================================================
   3) VALIDAR FORMULARIO
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
   4) GUARDAR / ACTUALIZAR DIRECCIÓN EN SUPABASE
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
    console.log("✏ Actualizando dirección existente…");

    result = await sb
      .from("addresses")
      .update(payload)
      .eq("id", loadedAddressId)
      .select()
      .single();
  } else {
    console.log("➕ Insertando nueva dirección…");

    result = await sb
      .from("addresses")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    console.error("❌ Error guardando dirección:", result.error);
    alert("Ocurrió un error guardando tu dirección.");
    btnSubmit.classList.remove("btn-loading");
    return false;
  }

  return true;
}

/* ============================================================
   5) SUBMIT FINAL
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

  console.log("🎉 Dirección guardada correctamente.");

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 800);
});

/* ============================================================
   INICIO
============================================================ */
cargarUsuario();
