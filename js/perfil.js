// ============================================================
// PERFIL DE USUARIO — Café Cortero (VERSIÓN PREMIUM 2025)
// Actualización de datos, foto, validación M3 y Snackbar premium
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const authExt = window.supabaseAuth;

  // =============================
  // ELEMENTOS DEL DOM
  // =============================
  const nombreInput = document.getElementById("nombreInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const correoInput = document.getElementById("correoInput");

  const cambiarPassBtn = document.getElementById("cambiarPassBtn");
  const passwordSection = document.getElementById("passwordSection");

  const passActual = document.getElementById("passActual");
  const passNueva = document.getElementById("passNueva");
  const passConfirm = document.getElementById("passConfirm");

  const saveBtn = document.getElementById("saveBtn");
  const btnLoader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("fotoInput");

  const snackbar = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  let user = null;

  // ============================================================
  // SNACKBAR
  // ============================================================
  function mostrarSnackbar(msg) {
    snackText.textContent = msg;
    snackbar.classList.add("show");
    setTimeout(() => snackbar.classList.remove("show"), 2600);
  }

  // ============================================================
  // ACTIVAR LOADING
  // ============================================================
  function activarLoading() {
    saveBtn.classList.add("loading");
    saveBtn.disabled = true;
    btnText.style.opacity = "0";
    btnLoader.style.display = "inline-block";
  }

  function desactivarLoading() {
    saveBtn.classList.remove("loading");
    saveBtn.disabled = false;
    btnText.style.opacity = "1";
    btnLoader.style.display = "none";
  }

  // ============================================================
  // CARGAR DATOS DEL USUARIO
  // ============================================================
  async function cargarPerfil() {

    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) {
      window.location.href = "login.html";
      return;
    }

    user = data.user;

    // Obtener info extendida desde tabla `users`
    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    // RELLENAR CAMPOS
    nombreInput.value = info.nombre || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email || "";

    // FOTO
    if (info.avatar_url) {
      fotoPerfil.src = info.avatar_url;
    }
  }

  cargarPerfil();

  // ============================================================
  // FOTO — ABRIR INPUT
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    activarLoading();

    const nombreArchivo = `avatar_${user.id}_${Date.now()}.jpg`;

    // SUBIR AL STORAGE
    const { error: storageErr } = await sb.storage
      .from("avatars")
      .upload(nombreArchivo, file, {
        contentType: file.type
      });

    if (storageErr) {
      desactivarLoading();
      return mostrarSnackbar("Error subiendo la foto");
    }

    // Obtener URL pública
    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(nombreArchivo);

    // Guardar en DB
    await sb
      .from("users")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id);

    fotoPerfil.src = urlData.publicUrl;

    desactivarLoading();
    mostrarSnackbar("Foto actualizada");
  });

  // ============================================================
  // TOGGLE CONTRASEÑA
  // ============================================================
  cambiarPassBtn.addEventListener("click", () => {
    passwordSection.style.display =
      passwordSection.style.display === "block" ? "none" : "block";
  });

  // ============================================================
  // GUARDAR CAMBIOS
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    activarLoading();

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();

    if (nombre.length < 2) {
      desactivarLoading();
      return mostrarSnackbar("Nombre inválido");
    }

    if (telefono.length < 8) {
      desactivarLoading();
      return mostrarSnackbar("Teléfono inválido");
    }

    // GUARDAR DATOS
    await sb
      .from("users")
      .update({
        nombre,
        phone: telefono
      })
      .eq("id", user.id);

    // CAMBIO DE CONTRASEÑA -----------------------------------
    if (passwordSection.style.display === "block") {

      if (!passActual.value || !passNueva.value || !passConfirm.value) {
        desactivarLoading();
        return mostrarSnackbar("Completa los campos de contraseña");
      }

      if (passNueva.value !== passConfirm.value) {
        desactivarLoading();
        return mostrarSnackbar("Las contraseñas no coinciden");
      }

      if (passNueva.value.length < 6) {
        desactivarLoading();
        return mostrarSnackbar("Contraseña muy corta");
      }

      const cambio = await authExt.changePassword(
        passActual.value,
        passNueva.value
      );

      if (!cambio.ok) {
        desactivarLoading();
        return mostrarSnackbar("Contraseña actual incorrecta");
      }
    }

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");
  });

});
