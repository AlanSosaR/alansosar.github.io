// ============================================================
// PERFIL — Datos reales + Foto + Contraseña + Fuerza de password
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
  const passwordSection = document.getElementById("bloquePassword");

  const passActual = document.getElementById("oldPassword");
  const passNueva = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("inputFoto");

  const saveBtn = document.getElementById("saveBtn");
  const btnLoader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const strengthBars = document.getElementById("strengthBars").children;

  const snackbar = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  let user = null;

  // =============================
  // SNACKBAR
  // =============================
  function mostrarSnackbar(msg) {
    snackText.textContent = msg;
    snackbar.classList.add("show");
    setTimeout(() => snackbar.classList.remove("show"), 2600);
  }

  function activarLoading() {
    saveBtn.classList.add("loading");
    saveBtn.disabled = true;
    btnLoader.style.display = "inline-block";
    btnText.style.opacity = "1";
  }

  function desactivarLoading() {
    saveBtn.classList.remove("loading");
    saveBtn.disabled = false;
    btnLoader.style.display = "none";
    btnText.style.opacity = "1";
  }

  // ============================================================
  // CARGAR PERFIL DESDE SUPABASE
  // ============================================================
  async function cargarPerfil() {
    const { data, error } = await sb.auth.getUser();

    if (error || !data.user) {
      window.location.href = "login.html";
      return;
    }

    user = data.user;

    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!info) return;

    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email || "";

    if (info.photo_url) {
      fotoPerfil.src = info.photo_url;
    }
  }

  cargarPerfil();

  // ============================================================
  // FOTO DE PERFIL — SUBIR A SUPABASE + GUARDAR EN BD
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  document.getElementById("btnEditarFoto").addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    activarLoading();

    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

    // Subir al bucket
    const { error: uploadErr } = await sb.storage
      .from("avatars")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadErr) {
      desactivarLoading();
      return mostrarSnackbar("Error al subir la foto");
    }

    // Obtener URL pública
    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = urlData.publicUrl;

    // Guardar en BD
    await sb
      .from("users")
      .update({ photo_url: newUrl })
      .eq("id", user.id);

    // ============================================================
    // 🟢 GUARDAR EN sessionStorage (para menú y persistencia)
    // ============================================================
    let usr = sessionStorage.getItem("cortero_user");
    if (usr) {
      try {
        usr = JSON.parse(usr);
        usr.photo_url = newUrl;
        sessionStorage.setItem("cortero_user", JSON.stringify(usr));
      } catch (err) {
        console.warn("Error guardando foto en sessionStorage:", err);
      }
    }

    // ============================================================
    // 🟢 Notificar al menú global
    // ============================================================
    document.dispatchEvent(new CustomEvent("userPhotoUpdated", {
      detail: { photo_url: newUrl }
    }));

    // Actualizar UI del perfil
    fotoPerfil.src = newUrl;

    desactivarLoading();
    mostrarSnackbar("Foto actualizada");
  });

  // ============================================================
  // MOSTRAR / OCULTAR CONTRASEÑAS
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const target = document.getElementById(icon.dataset.target);
      target.type = target.type === "password" ? "text" : "password";
    });
  });

  // ============================================================
  // BLOQUE DE CONTRASEÑA — ANIMACIÓN SUAVE
  // ============================================================
  passwordSection.style.display = "none";
  passwordSection.style.opacity = "0";
  passwordSection.style.transition = "opacity .25s ease";

  btnMostrarPass.addEventListener("click", () => {
    if (passwordSection.style.display === "none") {
      passwordSection.style.display = "block";
      setTimeout(() => passwordSection.style.opacity = "1", 10);
    } else {
      passwordSection.style.opacity = "0";
      setTimeout(() => passwordSection.style.display = "none", 250);
    }
  });

  // ============================================================
  // BARRAS DE FUERZA DE CONTRASEÑA (MISMAS DE REGISTRO)
  // ============================================================
  function evaluarFuerza(pass) {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  }

  passNueva.addEventListener("input", () => {
    const score = evaluarFuerza(passNueva.value);

    Array.from(strengthBars).forEach((bar, i) => {
      bar.style.background = i < score ? "#33673B" : "#e0e0e0";
    });
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

    // Guardar datos básicos
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

    // Actualizar nombre/teléfono en sesión
    let usr = sessionStorage.getItem("cortero_user");
    if (usr) {
      try {
        usr = JSON.parse(usr);
        usr.name = nombre;
        usr.phone = telefono;

        sessionStorage.setItem("cortero_user", JSON.stringify(usr));
      } catch (err) {}
    }

    // Notificar al menú
    document.dispatchEvent(new CustomEvent("userDataUpdated"));

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");
  });

});
