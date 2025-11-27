// ============================================================
// PERFIL — Datos reales + Foto + Contraseña + Fuerza de password
// Con foto que solo sube al presionar "Guardar cambios"
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  const sb = window.supabaseClient;
  const authExt = window.supabaseAuth;

  // =============================
  // ELEMENTOS DEL DOM
  // =============================
  const nombreInput   = document.getElementById("nombreInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const correoInput   = document.getElementById("correoInput");

  const btnMostrarPass   = document.getElementById("btnMostrarPass");
  const passwordSection  = document.getElementById("bloquePassword");

  const passActual  = document.getElementById("oldPassword");
  const passNueva   = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput  = document.getElementById("inputFoto");

  const saveBtn    = document.getElementById("saveBtn");
  const btnLoader  = saveBtn.querySelector(".loader");
  const btnText    = saveBtn.querySelector(".btn-text");

  const strengthBarsWrapper = document.getElementById("strengthBars");
  const strengthBars = strengthBarsWrapper ? strengthBarsWrapper.children : [];

  const snackbar  = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  let user = null;
  let newPhotoFile = null; // ⚡ foto seleccionada pero NO subida todavía

  // =============================
  // SNACKBAR
  // =============================
  function mostrarSnackbar(msg) {
    if (!snackText || !snackbar) return;
    snackText.textContent = msg;
    snackbar.classList.add("show");
    setTimeout(() => snackbar.classList.remove("show"), 2600);
  }

  function activarLoading() {
    saveBtn.classList.add("loading");
    saveBtn.disabled = true;
    btnLoader.style.display = "inline-block";
  }

  function desactivarLoading() {
    saveBtn.classList.remove("loading");
    saveBtn.disabled = false;
    btnLoader.style.display = "none";
  }

  // ============================================================
  // CARGAR PERFIL DESDE SUPABASE (USANDO waitForSupabaseSession)
  // ============================================================
  async function cargarPerfil() {

    // 1️⃣ Esperar sesión real (usa helper del core si existe)
    let currentUser = null;

    if (typeof window.waitForSupabaseSession === "function") {
      currentUser = await window.waitForSupabaseSession();
    } else {
      const { data: sessionData } = await sb.auth.getSession();
      currentUser = sessionData?.session?.user || null;
    }

    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }

    user = currentUser;

    // 2️⃣ Leer datos reales de la tabla users
    const { data: info, error } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.warn("Error cargando perfil:", error);
      return;
    }
    if (!info) return;

    nombreInput.value   = info.name  || "";
    telefonoInput.value = info.phone || "";
    correoInput.value   = user.email || "";

    fotoPerfil.src = info.photo_url || "imagenes/avatar-default.svg";

    // 3️⃣ Guardar espejo en sessionStorage para el menú
    sessionStorage.setItem("cortero_user", JSON.stringify({
      id:    user.id,
      email: user.email,
      name:  info.name,
      phone: info.phone,
      photo_url: info.photo_url
    }));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));
  }

  await cargarPerfil();

  // ============================================================
  // FOTO — SOLO PREVIEW (NO SE SUBE AUTOMÁTICO)
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  const btnEditarFoto = document.getElementById("btnEditarFoto");
  if (btnEditarFoto) {
    btnEditarFoto.addEventListener("click", () => fotoInput.click());
  }

  fotoInput.addEventListener("change", () => {
    const file = fotoInput.files[0];
    if (!file) return;

    newPhotoFile = file; // ⚡ Se guarda para subirla al guardar cambios

    // Preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      fotoPerfil.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ============================================================
  // MOSTRAR / OCULTAR CONTRASEÑAS
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const target = document.getElementById(icon.dataset.target);
      if (!target) return;
      target.type = target.type === "password" ? "text" : "password";
    });
  });

  // ============================================================
  // BLOQUE CONTRASEÑA — ANIMACIÓN SUAVE
  // ============================================================
  if (passwordSection) {
    passwordSection.style.display   = "none";
    passwordSection.style.opacity   = "0";
    passwordSection.style.transition = "opacity .25s";
  }

  if (btnMostrarPass) {
    btnMostrarPass.addEventListener("click", () => {
      if (!passwordSection) return;

      if (passwordSection.style.display === "none") {
        passwordSection.style.display = "block";
        setTimeout(() => passwordSection.style.opacity = "1", 10);
      } else {
        passwordSection.style.opacity = "0";
        setTimeout(() => passwordSection.style.display = "none", 250);
      }
    });
  }

  // ============================================================
  // FUERZA DE CONTRASEÑA
  // ============================================================
  function evaluarFuerza(pass) {
    let score = 0;
    if (pass.length >= 6)  score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  }

  if (passNueva) {
    passNueva.addEventListener("input", () => {
      if (!strengthBars || !strengthBars.length) return;

      const score = evaluarFuerza(passNueva.value);
      Array.from(strengthBars).forEach((bar, i) => {
        bar.style.background = i < score ? "#33673B" : "#e0e0e0";
      });
    });
  }

  // ============================================================
  // GUARDAR CAMBIOS
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!user) {
      return mostrarSnackbar("Sesión no encontrada");
    }

    activarLoading();

    const nombre   = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();

    let finalPhotoUrl = null;

    // 1️⃣ Si hay foto nueva → subir ahora
    if (newPhotoFile) {
      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

      const { error: uploadErr } = await sb.storage
        .from("avatars")
        .upload(fileName, newPhotoFile, {
          contentType: newPhotoFile.type,
          upsert: true
        });

      if (uploadErr) {
        console.warn("Error subiendo foto:", uploadErr);
        desactivarLoading();
        return mostrarSnackbar("Error al guardar la foto");
      }

      const { data: urlData } = sb.storage
        .from("avatars")
        .getPublicUrl(fileName);

      finalPhotoUrl = urlData.publicUrl;
    }

    // 2️⃣ Guardar datos en BD
    await sb
      .from("users")
      .update({
        name: nombre,
        phone: telefono,
        ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {})
      })
      .eq("id", user.id);

    // 3️⃣ Cambio de contraseña (si se abrió el bloque)
    if (passwordSection && passwordSection.style.display === "block") {

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

    // 4️⃣ Sincronizar sessionStorage
    let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    usr.name  = nombre;
    usr.phone = telefono;
    if (finalPhotoUrl) usr.photo_url = finalPhotoUrl;

    sessionStorage.setItem("cortero_user", JSON.stringify(usr));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));
    if (finalPhotoUrl) {
      document.dispatchEvent(new CustomEvent("userPhotoUpdated", {
        detail: { photo_url: finalPhotoUrl }
      }));
    }

    newPhotoFile = null;

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");
  });

});
