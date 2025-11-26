// ============================================================
// PERFIL — Cargar datos reales de Supabase + edición premium
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
  // CARGAR PERFIL REAL DESDE BD
  // ============================================================
  async function cargarPerfil() {

    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) {
      window.location.href = "login.html";
      return;
    }

    user = data.user;

    // Traer info del usuario
    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!info) return;

    // === CARGA CORRECTA DE CAMPOS ===
    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email || "";

    // FOTO CORRECTA
    if (info.photo_url) {
      fotoPerfil.src = info.photo_url;
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

    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

    // Subir imagen
    const { error: storageErr } = await sb.storage
      .from("avatars")
      .upload(fileName, file, {
        contentType: file.type
      });

    if (storageErr) {
      desactivarLoading();
      return mostrarSnackbar("Error al subir la foto");
    }

    // Obtener URL pública
    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Guardar en BD → columna correcta
    await sb
      .from("users")
      .update({ photo_url: imageUrl })
      .eq("id", user.id);

    fotoPerfil.src = imageUrl;

    desactivarLoading();
    mostrarSnackbar("Foto actualizada");
  });

  // ============================================================
  // CAMBIAR CONTRASEÑA
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

    // Guardar datos
    await sb
      .from("users")
      .update({
        name: nombre,
        phone: telefono
      })
      .eq("id", user.id);

    // Cambio de contraseña
    if (passwordSection.style.display === "block") {

      if (!passActual.value || !passNueva.value || !passConfirm.value) {
        desactivarLoading();
        return mostrarSnackbar("Completa las contraseñas");
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
