// =============================
// FORMULARIO DE DATOS DEL CLIENTE
// Café Cortero ☕
// =============================

const form = document.getElementById("cliente-form");
const CLIENTE_KEY = "cliente_info";

// saber si venimos de recibo.html?from=recibo
function isFromRecibo() {
  const params = new URLSearchParams(window.location.search);
  return params.get("from") === "recibo";
}

// limpiar cuando venimos del carrito
function clearForm() {
  form.reset();
  document.querySelectorAll(".error-msg").forEach(el => el.remove());
}

// cargar datos cuando venimos a editar
function loadClientData() {
  const cliente = JSON.parse(localStorage.getItem(CLIENTE_KEY));
  if (!cliente) return;

  document.getElementById("nombre").value = cliente.nombre || "";
  document.getElementById("correo").value = cliente.correo || "";
  document.getElementById("telefono").value = cliente.telefono || "";
  document.getElementById("zona").value = cliente.zona || "";

  // si en localStorage está "DEPTO - detalle", aquí solo mostramos el detalle
  const direccionSoloDetalle =
    cliente.direccion?.replace(`${cliente.zona} - `, "") || cliente.direccion || "";
  document.getElementById("direccion").value = direccionSoloDetalle;

  document.getElementById("nota").value = cliente.nota || "";
}

// toast flotante
function mostrarToast(mensaje, tipo = "ok") {
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("visible"), 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 350);
  }, 2500);
}

// mensaje de error debajo del campo
function mostrarError(idCampo, mensaje) {
  const campo = document.getElementById(idCampo);
  const grupo = campo.closest(".form-group");

  const anterior = grupo.querySelector(".error-msg");
  if (anterior) anterior.remove();

  const small = document.createElement("small");
  small.className = "error-msg";
  small.textContent = mensaje;
  grupo.appendChild(small);

  campo.classList.add("input-error");
}

// quitar error al escribir
function limpiarError(campo) {
  campo.classList.remove("input-error");
  const grupo = campo.closest(".form-group");
  const err = grupo.querySelector(".error-msg");
  if (err) err.remove();
}

// validar obligatorios
function validarCampos() {
  let ok = true;

  const nombre = document.getElementById("nombre");
  const correo = document.getElementById("correo");
  const telefono = document.getElementById("telefono");
  const zona = document.getElementById("zona");
  const direccion = document.getElementById("direccion");

  if (!nombre.value.trim()) {
    mostrarError("nombre", "El nombre es obligatorio");
    ok = false;
  }
  if (!telefono.value.trim()) {
    mostrarError("telefono", "El teléfono es obligatorio");
    ok = false;
  }
  if (!zona.value.trim()) {
    mostrarError("zona", "Selecciona un departamento");
    ok = false;
  }
  if (!direccion.value.trim()) {
    mostrarError("direccion", "La dirección es obligatoria");
    ok = false;
  }

  // correo opcional pero con formato
  if (correo.value.trim()) {
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!re.test(correo.value.trim())) {
      mostrarError("correo", "El correo no es válido");
      ok = false;
    }
  }

  return ok;
}

// al cargar la página
window.addEventListener("DOMContentLoaded", () => {
  if (isFromRecibo()) {
    // viene de recibo → cargar
    loadClientData();
  } else {
    // viene del carrito → limpiar
    clearForm();
  }

  // limpiar error al escribir
  form.querySelectorAll("input, select, textarea").forEach(el => {
    el.addEventListener("input", () => limpiarError(el));
  });
});

// enviar
form.addEventListener("submit", (e) => {
  e.preventDefault();
  document.querySelectorAll(".error-msg").forEach(el => el.remove());

  if (!validarCampos()) return;

  const zona = document.getElementById("zona").value.trim();
  const direccionDetalle = document.getElementById("direccion").value.trim();
  const direccionCompleta = `${zona} - ${direccionDetalle}`;

  const cliente = {
    nombre: document.getElementById("nombre").value.trim(),
    correo: document.getElementById("correo").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    zona: zona,
    direccion: direccionCompleta,
    nota: document.getElementById("nota").value.trim(),
  };

  localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));

  // texto distinto si venimos desde recibo
  const msg = isFromRecibo()
    ? "✏️ Datos actualizados correctamente"
    : "✅ Datos guardados correctamente";

  mostrarToast(msg, "ok");

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 1000);
});
