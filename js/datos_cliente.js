// =============================
// FORMULARIO DE DATOS DEL CLIENTE
// Café Cortero ☕
// =============================

const form = document.getElementById("cliente-form");
const guardadoBox = document.getElementById("guardado");

// Si hay datos guardados, precargarlos
window.addEventListener("DOMContentLoaded", () => {
  const cliente = JSON.parse(localStorage.getItem("cliente_info"));
  if (cliente) {
    document.getElementById("nombre").value = cliente.nombre || "";
    document.getElementById("correo").value = cliente.correo || "";
    document.getElementById("telefono").value = cliente.telefono || "";
    document.getElementById("zona").value = cliente.zona || "";
    document.getElementById("direccion").value = cliente.direccion || "";
    document.getElementById("nota").value = cliente.nota || "";
  }
});

// Guardar datos del cliente
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const cliente = {
    nombre: document.getElementById("nombre").value.trim(),
    correo: document.getElementById("correo").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    zona: document.getElementById("zona").value,
    direccion: document.getElementById("direccion").value.trim(),
    nota: document.getElementById("nota").value.trim(),
  };

  localStorage.setItem("cliente_info", JSON.stringify(cliente));

  guardadoBox.style.display = "block";
  setTimeout(() => {
    guardadoBox.style.display = "none";
    window.location.href = "recibo.html";
  }, 1500);
});
