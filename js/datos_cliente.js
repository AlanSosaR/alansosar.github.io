// =============================
// FORMULARIO DE DATOS DEL CLIENTE
// Café Cortero ☕
// =============================

const form = document.getElementById("cliente-form");
const CLIENTE_KEY = "cliente_info";

// Detectar si viene desde el recibo (para editar)
function isFromRecibo() {
  const params = new URLSearchParams(window.location.search);
  return params.get("from") === "recibo";
}

// Limpiar formulario (cuando venimos del carrito)
function clearForm() {
  form.reset();
  document.querySelectorAll(".error-msg").forEach(el => el.remove());
  localStorage.removeItem(CLIENTE_KEY_TEMP);
}

// Cargar datos guardados (solo si venimos desde el recibo)
function loadClientData() {
  const cliente = JSON.parse(localStorage.getItem(CLIENTE_KEY));
  if (cliente) {
    document.getElementById("nombre").value = cliente.nombre || "";
    document.getElementById("correo").value = cliente.correo || "";
    document.getElementById("telefono").value = cliente.telefono || "";
    document.getElementById("zona").value = cliente.zona || "";
    document.getElementById("direccion").value = cliente.direccion || "";
    document.getElementById("nota").value = cliente.nota || "";
  }
}

// Mostrar notificación tipo “toast”
function mostrarToast(mensaje, tipo = "ok") {
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("visible"), 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// Mostrar mensaje de error debajo del campo
function mostrarError(idCampo, mensaje) {
  const campo = document.getElementById(idCampo);
  const grupo = campo.closest(".form-group");

  const anterior = grupo.querySelector(".error-msg");
  if (anterior) anterior.remove();

  const error = document.createElement("small");
  error.className = "error-msg";
  error.textContent = mensaje;
  grupo.appendChild(error);
  campo.classList.add("input-error");
}

// Quitar error cuando el usuario escribe
function limpiarError(campo) {
  campo.classList.remove("input-error");
  const grupo = campo.closest(".form-group");
  const error = grupo.querySelector(".error-msg");
  if (error) error.remove();
}

// Validar campos obligatorios
function validarCampos() {
  let valido = true;

  const nombre = document.getElementById("nombre");
  const correo = document.getElementById("correo");
  const telefono = document.getElementById("telefono");
  const zona = document.getElementById("zona");
  const direccion = document.getElementById("direccion");

  if (!nombre.value.trim()) {
    mostrarError("nombre", "El nombre es obligatorio");
    valido = false;
  }

  if (!telefono.value.trim()) {
    mostrarError("telefono", "El teléfono es obligatorio");
    valido = false;
  }

  if (!zona.value.trim()) {
    mostrarError("zona", "Selecciona un departamento");
    valido = false;
  }

  if (!direccion.value.trim()) {
    mostrarError("direccion", "La dirección es obligatoria");
    valido = false;
  }

  // Correo opcional: validar formato solo si se escribe algo
  if (correo.value.trim()) {
    const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!regex.test(correo.value.trim())) {
      mostrarError("correo", "El correo no tiene un formato válido");
      valido = false;
    }
  }

  return valido;
}

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
  if (isFromRecibo()) {
    loadClientData(); // 🔁 Cargar solo al venir desde recibo
  } else {
    clearForm(); // 🧹 Limpiar si venís del carrito
  }

  form.querySelectorAll("input, select, textarea").forEach(input => {
    input.addEventListener("input", () => limpiarError(input));
  });
});

// Guardar datos y redirigir
form.addEventListener("submit", (e) => {
  e.preventDefault();
  document.querySelectorAll(".error-msg").forEach(el => el.remove());

  if (!validarCampos()) return;

  const cliente = {
    nombre: document.getElementById("nombre").value.trim(),
    correo: document.getElementById("correo").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    zona: document.getElementById("zona").value.trim(),
    direccion: document.getElementById("direccion").value.trim(),
    nota: document.getElementById("nota").value.trim(),
  };

  localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));

  mostrarToast("✅ Datos guardados correctamente");

  setTimeout(() => {
    window.location.href = "recibo.html";
  }, 1000);
});
