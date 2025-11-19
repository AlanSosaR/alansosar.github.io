form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarErrores();

  let valido = true;

  // NOMBRE
  if (campos.nombre.value.trim() === "") {
    marcar("nombre", "Ingresa tu nombre");
    valido = false;
  }

  // CORREO — VALIDACIÓN REAL
  const email = campos.correo.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    marcar("correo", "Correo inválido");
    valido = false;
  }

  // TELÉFONO
  if (campos.telefono.value.trim().length < 8) {
    marcar("telefono", "Teléfono inválido");
    valido = false;
  }

  // CONTRASEÑA
  if (campos.password.value.length < 6) {
    marcar("password", "Mínimo 6 caracteres");
    valido = false;
  }

  // CONFIRMAR CONTRASEÑA
  if (campos.password.value !== campos.confirm.value) {
    marcar("confirm", "No coinciden");
    valido = false;
  }

  if (!valido) return;

  /* ===============================
     SUPABASE
  ================================ */
  try {
    await registerUser(
      email,                                  // ← correo correcto
      campos.password.value.trim(),
      campos.telefono.value.trim(),
      campos.nombre.value.trim(),
      "Honduras",
      fotoBase64
    );

    alert("Cuenta creada con éxito ✔");
    window.location.href = "login.html";

  } catch (err) {
    alert("Error registrando usuario");
    console.error(err);
  }
});
