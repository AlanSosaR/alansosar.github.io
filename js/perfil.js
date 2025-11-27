// ============================================================
// PERFIL — Versión ESTABLE FINAL (Foto solo al guardar cambios)
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

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

  const snackbar = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  const strengthBars = document.getElementById("strengthBars")?.children || [];

  let userAuth = null;
  let userDB = null;

  // 📌 FOTO TEMPORAL PARA SUBIR SOLO AL GUARDAR
  let nuevaFotoArchivo = null;
  let nuevaFotoPreview = null;


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
  // CARGAR PERFIL DESDE SUPABASE
  // ============================================================
  async function cargarPerfil() {
    const { data: sessionData } = await sb.auth.getSession();

    if (!sessionData?.session?.user) {
      window.location.href = "login.html";
      return;
    }

    userAuth = sessionData.session.user;
    correoInput.value = userAuth.email;

    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", userAuth.id)
      .single();

    userDB = info;

    nombreInput.value = info?.name || "";
    telefonoInput.value = info?.phone || "";
    fotoPerfil.src = info?.photo_url || "imagenes/avatar-default.svg";

    sessionStorage.setItem("cortero_user", JSON.stringify({
      id: userAuth.id,
      email: userAuth.email,
      name: info?.name,
      phone: info?.phone,
      photo_url: info?.photo_url
    }));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));
  }

  await cargarPerfil();


  // ============================================================
  // FOTO — SOLO PREVIEW (NO SUBE)
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  document.getElementById("btnEditarFoto").addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", () => {
    const file = fotoInput.files[0];
    if (!file) return;

    nuevaFotoArchivo = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      nuevaFotoPreview = e.target.result;
      fotoPerfil.src = nuevaFotoPreview; // solo preview
    };
    reader.readAsDataURL(file);
  });


  // ============================================================
  // MOSTRAR / OCULTAR CONTRASEÑAS
  // ============================================================
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  btnMostrarPass.addEventListener("click", () => {
    const visible = passwordSection.style.display !== "none";
    passwordSection.style.display = visible ? "none" : "block";
    passwordSection.style.opacity = visible ? "0" : "1";
  });


  // ============================================================
  // FUERZA DE CONTRASEÑA
  // ============================================================
  function evaluarFuerza(pass) {
    let n = 0;
    if (pass.length >= 6) n++;
    if (pass.length >= 10) n++;
    if (/[A-Z]/.test(pass)) n++;
    if (/[a-z]/.test(pass)) n++;
    if (/[0-9]/.test(pass)) n++;
    if (/[^A-Za-z0-9]/.test(pass)) n++;
    return n;
  }

  document.getElementById("newPassword")?.addEventListener("input", () => {
    const level = evaluarFuerza(passNueva.value);
    Array.from(strengthBars).forEach((bar, i) => {
      bar.style.background = i < level ? "#33673B" : "#e0e0e0";
    });
  });


  // ============================================================
  // GUARDAR CAMBIOS (SUBE FOTO SI EXISTE)
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    activarLoading();

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();
    let fotoFinal = userDB?.photo_url || "imagenes/avatar-default.svg";

    // 📌 1️⃣ Si hay foto nueva, subirla AHORA
    if (nuevaFotoArchivo) {
      const fileName = `avatar_${userAuth.id}_${Date.now()}.jpg`;

      await sb.storage.from("avatars").upload(fileName, nuevaFotoArchivo, {
        upsert: true,
        contentType: nuevaFotoArchivo.type
      });

      const { data: urlData } = sb.storage.from("avatars").getPublicUrl(fileName);
      fotoFinal = urlData.publicUrl;
    }

    // 📌 2️⃣ Actualizar DB
    await sb.from("users")
      .update({
        name: nombre,
        phone: telefono,
        photo_url: fotoFinal
      })
      .eq("id", userAuth.id);

    // 📌 3️⃣ Cambiar contraseña si es necesario
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
        return mostrarSnackbar("Contraseña demasiado corta");
      }

      const resp = await authExt.changePassword(passActual.value, passNueva.value);
      if (!resp.ok) {
        desactivarLoading();
        return mostrarSnackbar("Contraseña actual incorrecta");
      }
    }

    // 📌 4️⃣ Sincronizar en memoria
    sessionStorage.setItem("cortero_user", JSON.stringify({
      id: userAuth.id,
      email: userAuth.email,
      name: nombre,
      phone: telefono,
      photo_url: fotoFinal
    }));

    document.dispatchEvent(new CustomEvent("userPhotoUpdated", {
      detail: { photo_url: fotoFinal }
    }));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");

    // limpiar archivo temporal
    nuevaFotoArchivo = null;
  });

});
