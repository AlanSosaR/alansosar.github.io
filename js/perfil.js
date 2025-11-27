// ============================================================
// PERFIL — Versión ESTABLE FINAL (Lectura REAL desde Supabase)
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
  const btnText = saveBtn.querySelector(".btn-text");

  const strengthBars = document.getElementById("strengthBars")?.children || [];

  const snackbar = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  let userAuth = null;
  let userDB = null;


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

    // ⚡ 1️⃣ Leer sesión real (FIX para iPhone / Safari)
    const { data: sessionData } = await sb.auth.getSession();

    if (!sessionData?.session?.user) {
      window.location.href = "login.html";
      return;
    }

    userAuth = sessionData.session.user;
    correoInput.value = userAuth.email;


    // ⚡ 2️⃣ Leer perfil desde tabla users
    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", userAuth.id)
      .single();

    userDB = info;

    nombreInput.value = info?.name || "";
    telefonoInput.value = info?.phone || "";
    fotoPerfil.src = info?.photo_url || "imagenes/avatar-default.svg";


    // ⚡ 3️⃣ Guardar espejo en sessionStorage
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
  // SUBIR FOTO
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  document.getElementById("btnEditarFoto").addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    activarLoading();

    const fileName = `avatar_${userAuth.id}_${Date.now()}.jpg`;

    await sb.storage.from("avatars").upload(fileName, file, {
      upsert: true,
      contentType: file.type
    });

    const { data: urlData } = sb.storage.from("avatars").getPublicUrl(fileName);
    const newUrl = urlData.publicUrl;

    await sb.from("users").update({ photo_url: newUrl }).eq("id", userAuth.id);

    fotoPerfil.src = newUrl;

    let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    usr.photo_url = newUrl;
    sessionStorage.setItem("cortero_user", JSON.stringify(usr));

    document.dispatchEvent(new CustomEvent("userPhotoUpdated", {
      detail: { photo_url: newUrl }
    }));

    desactivarLoading();
    mostrarSnackbar("Foto actualizada");
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

  passNueva?.addEventListener("input", () => {
    const level = evaluarFuerza(passNueva.value);
    Array.from(strengthBars).forEach((bar, i) => {
      bar.style.background = i < level ? "#33673B" : "#e0e0e0";
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
    const fotoActual = fotoPerfil.src;

    await sb.from("users")
      .update({
        name: nombre,
        phone: telefono,
        photo_url: fotoActual
      })
      .eq("id", userAuth.id);


    // CAMBIAR CONTRASEÑA (si está abierta la sección)
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


    // Sincronizar en memoria local
    sessionStorage.setItem("cortero_user", JSON.stringify({
      id: userAuth.id,
      email: userAuth.email,
      name: nombre,
      phone: telefono,
      photo_url: fotoActual
    }));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));

    desactivarLoading();
    mostrarSnackbar("Cambios guardados");
  });

});
