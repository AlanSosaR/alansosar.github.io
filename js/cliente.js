document.getElementById('cliente-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const zona = document.getElementById('zona').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const nota = document.getElementById('nota').value.trim();

  // Validación básica
  if (!nombre || !correo || !telefono || !zona || !direccion) {
    alert('Por favor complete todos los campos obligatorios.');
    return;
  }

  // Guardar datos del cliente en localStorage
  const cliente = { nombre, correo, telefono, zona, direccion, nota };
  localStorage.setItem('cliente_info', JSON.stringify(cliente));

  // Ir al recibo
  window.location.href = 'recibo.html';
});
