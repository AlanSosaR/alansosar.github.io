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

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const oldPasswordInput = document.getElementById("oldPassword");
  const newPasswordInput = document.getElementById("newPassword");

  const saveBtn = document.querySelector(".m3-btn");
  const btnLoader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const fotoPerfil = document.getElementById("fotoPerfil");
  const inputFoto = document.getElementById("inputFoto");
  const btnEditarFoto = document.getElementById("btnEditarFoto");

  const snackbar = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  // Barras de seguridad
  const passwordStrengthBar = document.getElementById("passwordStrengthBar");
  const passwordStrengthText = document.getElementById("passwordStrengthText");

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
  // CARGAR PERFIL REAL DESDE SUPABASE
  // ============================================================
  async function cargarPerfil() {
    const { data, error } = await sb.auth.getUser();

    if (error || !data.user) {
      window.location.href = "login.html";
      return;
    }

    user = data.user;

    // Traer info de la tabla users
    const { data: info, error: errInfo } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (errInfo || !info) return;

    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email || "";

    // FOTO
    if (info.photo_url) {
      fotoPerfil.src = info.photo_url;
    }
  }

  cargarPerfil();

  // ============================================================
  // FOTO — CLICK → ABRIR INPUT
  // ============================================================
  fotoPerfil.addEventListener("click", () => inputFoto.click());
  btnEditarFoto.addEventListener("click", () => inputFoto.click());

  inputFoto.addEventListener("change", async () => {
    const file = inputFoto.files[0];
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

    // Guardar en BD
    await sb
      .from("users")
      .update({ photo_url: imageUrl })
      .eq("id", user.id);

    fotoPerfil.src = imageUrl;

    desactivarLoading();
    mostrarSnackbar("Foto actualizada");
  });

  // ============================================================
  // MOSTRAR / OCULTAR CAMBIO DE CONTRASEÑA
  // ============================================================
  btnMostrarPass.addEventListener("click", () => {
    bloquePassword.style.display =
      bloquePassword.style.display === "block" ? "none" : "block";
  });

  // ============================================================
  // TOGGLE PASSWORD
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const targetId = icon.dataset.target;
      const input = document.getElementById(targetId);
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // ============================================================
  // BARRAS DE SEGURIDAD DE LA CONTRASEÑA
  // ============================================================

  function calcularSeguridad(password) {
    let puntos = 0;

    if (password.length >= 6) puntos++;
    if (password.length >= 10) puntos++;
    if (/[A-Z]/.test(password)) puntos++;
    if (/[0-9]/.test(password)) puntos++;
    if (/[^A-Za-z0-9]/.test(password)) puntos++;

    return puntos;
  }

  newPasswordInput.addEventListener("input", () => {
    const pass = newPasswordInput.value.trim();
    const puntos = calcularSeguridad(pass);

    // Limpiar estilos
    passwordStrengthBar.className = "strength-bar";
    passwordStrengthText.className = "strength-text";

    if (pass.length === 0) {
      passwordStrengthText.textContent = "";
      return;
    }

    if (puntos <= 2) {
      passwordStrengthBar.classList.add("weak");
      passwordStrengthText.textContent = "Contraseña débil";
      passwordStrengthText.classList.add("weak-text");

    } else if (puntos === 3 || puntos === 4) {
      passwordStrengthBar.classList.add("medium");
      passwordStrengthText.textContent = "Contraseña media";
      passwordStrengthText.classList.add("medium-text");

    } else if (puntos >= 5) {
      passwordStrengthBar.classList.add("strong");
      passwordStrengthText.textContent = "Contraseña fuerte";
      passwordStrengthText.classList.add("strong-text");
    }
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

    // GUARDAR DATOS EN BD
    await sb
      .from("users")
      .update({
        name: nombre,
        phone: telefono,
        updated_at: new Date()
      })
      .eq("id", user.id);

    // CAMBIAR CONTRASEÑA
    if (bloquePassword.style.display === "block") {
      const oldP = oldPasswordInput.value;
      const newP = newPasswordInput.value;

      if (!oldP || !newP) {
        desactivarLoading();
        return mostrarSnackbar("Completa las contraseñas");
      }

      if (newP.length < 6) {
        desactivarLoading();
        return mostrarSnackbar("Contraseña muy corta");
      }

      const cambio = await authExt.changePassword(oldP, newP);

      if (!cambio.ok) {
        desactivarLoading();
        return mostrarSnackbar("Contraseña actual incorrecta");
      }
    }

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");
  });

});
