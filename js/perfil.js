// ============================================================
// PERFIL — Datos reales + Foto + Contraseña + Fuerza de password
// Con foto que solo sube al presionar "Guardar cambios"
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
  let newPhotoFile = null; // ⚡ NUEVO → foto seleccionada pero NO subida


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
  }

  function desactivarLoading() {
    saveBtn.classList.remove("loading");
    saveBtn.disabled = false;
    btnLoader.style.display = "none";
  }

  // ============================================================
  // CARGAR PERFIL DESDE SUPABASE (FIX 100% REAL)
  // ============================================================
  async function cargarPerfil() {

    // FIX REAL para Safari / iPhone / GitHub Pages
    const { data: sessionData } = await sb.auth.getSession();

    if (!sessionData?.session?.user) {
      window.location.href = "login.html";
      return;
    }

    user = sessionData.session.user;

    // Leer datos reales de la tabla users
    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!info) return;

    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = user.email || "";

    fotoPerfil.src = info.photo_url || "imagenes/avatar-default.svg";

    // Guardar espejo en sessionStorage
    sessionStorage.setItem("cortero_user", JSON.stringify({
      id: user.id,
      email: user.email,
      name: info.name,
      phone: info.phone,
      photo_url: info.photo_url
    }));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));
  }

  cargarPerfil();


  // ============================================================
  // FOTO — SOLO PREVIEW (NO SE SUBE AUTOMÁTICO)
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  document.getElementById("btnEditarFoto").addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", () => {
    const file = fotoInput.files[0];
    if (!file) return;

    newPhotoFile = file; // ⚡ SE GUARDA PARA SUBIRLA DESPUÉS

    // Mostrar preview
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
      target.type = target.type === "password" ? "text" : "password";
    });
  });


  // ============================================================
  // CONTRASEÑA — EFECTO SUAVE
  // ============================================================
  passwordSection.style.display = "none";
  passwordSection.style.opacity = "0";
  passwordSection.style.transition = "opacity .25s";

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
  // FUERZA DE CONTRASEÑA
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

    let finalPhotoUrl = null;

    // ============================================================
    // 1️⃣ SI HAY FOTO NUEVA → SUBIRLA AHORA
    // ============================================================
    if (newPhotoFile) {

      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

      const { error: uploadErr } = await sb.storage
        .from("avatars")
        .upload(fileName, newPhotoFile, {
          contentType: newPhotoFile.type,
          upsert: true
        });

      if (uploadErr) {
        desactivarLoading();
        return mostrarSnackbar("Error al guardar la foto");
      }

      const { data: urlData } = sb.storage
        .from("avatars")
        .getPublicUrl(fileName);

      finalPhotoUrl = urlData.publicUrl;
    }


    // ============================================================
    // 2️⃣ GUARDAR DATOS EN BD
    // ============================================================
    await sb
      .from("users")
      .update({
        name: nombre,
        phone: telefono,
        ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {})
      })
      .eq("id", user.id);


    // ============================================================
    // 3️⃣ CAMBIAR CONTRASEÑA (SI APLICA)
    // ============================================================
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

      const cambio = await authExt.changePassword(passActual.value, passNueva.value);

      if (!cambio.ok) {
        desactivarLoading();
        return mostrarSnackbar("Contraseña actual incorrecta");
      }
    }

    // ============================================================
    // 4️⃣ SINCRONIZAR sessionStorage
    // ============================================================
    let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    usr.name = nombre;
    usr.phone = telefono;
    if (finalPhotoUrl) usr.photo_url = finalPhotoUrl;

    sessionStorage.setItem("cortero_user", JSON.stringify(usr));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));
    if (finalPhotoUrl) {
      document.dispatchEvent(new CustomEvent("userPhotoUpdated", {
        detail: { photo_url: finalPhotoUrl }
      }));
    }

    newPhotoFile = null; // reiniciar

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");
  });

});
