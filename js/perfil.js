// ============================================================
// PERFIL — VERSIÓN FINAL 2025 (LocalStorage + Sesión Real)
// ============================================================

console.log("🔥 PERFIL.JS INICIÓ");

// ============================================================
// HELPERS LOCALSTORAGE
// ============================================================
function leerUsuarioLS() {
  const raw = localStorage.getItem("cortero_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function guardarUsuarioLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

// Pintar datos en el formulario
function pintarPerfil(data) {
  if (!data) return;

  const nombreInput = document.getElementById("nombreInput");
  const correoInput = document.getElementById("correoInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const fotoPerfil = document.getElementById("fotoPerfil");

  nombreInput.value = data.name || "";
  correoInput.value = data.email || "";
  telefonoInput.value = data.phone || "";
  fotoPerfil.src = data.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado:", data);
}

// ============================================================
// ESPERAR SUPABASE + SESIÓN
// ============================================================
async function esperarSupabase() {
  let i = 0;
  while (!window.supabaseClient && i < 100) {
    await new Promise(res => setTimeout(res, 50));
    i++;
  }
}

async function esperarSesionReal() {
  let i = 0;
  while (i < 100) {
    const { data } = await window.supabaseClient.auth.getSession();
    if (data?.session?.user) return data.session.user;
    await new Promise(res => setTimeout(res, 50));
    i++;
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // 1) Pintar lo que haya en localStorage de inmediato
  pintarPerfil(leerUsuarioLS());

  // 2) Referencias de DOM
  const fotoContainer = document.querySelector(".foto-perfil-container");
  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("inputFoto");
  const btnEditarFoto = document.getElementById("btnEditarFoto");
  const saveBtn = document.getElementById("saveBtn");
  const btnLoader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const nombreInput = document.getElementById("nombreInput");
  const correoInput = document.getElementById("correoInput");
  const telefonoInput = document.getElementById("telefonoInput");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");
  const oldPassword = document.getElementById("oldPassword");
  const newPassword = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  const errorOldPass = document.getElementById("errorOldPass");
  const errorNewPass = document.getElementById("errorNewPass");
  const errorConfirmPass = document.getElementById("errorConfirmPass");

  // asegurar overlay correcto
  if (fotoContainer) fotoContainer.style.position = "relative";

  // Helpers del botón
  function startLoading() {
    saveBtn.classList.add("loading");
    btnText.style.opacity = "0";
    btnLoader.style.display = "inline-block";
  }

  function stopLoading() {
    saveBtn.classList.remove("loading");
    btnText.style.opacity = "1";
    btnLoader.style.display = "none";
  }

  // 3) Esperar Supabase
  console.log("⏳ Esperando Supabase…");
  await esperarSupabase();
  const sb = window.supabaseClient;

  // 4) Esperar sesión real
  console.log("⏳ Esperando sesión real…");
  const user = await esperarSesionReal();
  if (!user) {
    console.log("❌ No hay sesión, redirigiendo a login…");
    window.location.href = "login.html";
    return;
  }

  // 5) Cargar datos frescos de BD
  console.log("📡 Cargando datos desde BD…");
  const { data: info, error } = await sb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  let usuarioActual = info || leerUsuarioLS() || {
    id: user.id,
    name: "",
    email: user.email,
    phone: "",
    photo_url: "imagenes/avatar-default.svg"
  };

  if (error) {
    console.warn("⚠ Error al obtener perfil, uso LS:", error);
  }

  pintarPerfil(usuarioActual);
  guardarUsuarioLS(usuarioActual);

  // ============================================================
  // FOTO: seleccionar archivo (solo vista previa)
  // ============================================================
  let nuevaFotoArchivo = null;

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFotoArchivo = file;
    fotoPerfil.src = URL.createObjectURL(file); // vista previa inmediata
  });

  // ============================================================
  // CAMBIAR CONTRASEÑA: toggle bloque
  // ============================================================
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "none" || bloquePassword.style.display === "") {
      bloquePassword.style.display = "block";
      setTimeout(() => bloquePassword.style.opacity = "1", 20);
    } else {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 250);
    }
  });

  function limpiarErroresPass() {
    errorOldPass.textContent = "";
    errorNewPass.textContent = "";
    errorConfirmPass.textContent = "";
  }

  // ============================================================
  // GUARDAR CAMBIOS (nombre, teléfono, foto, contraseña)
// ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();
    limpiarErroresPass();

    try {
      let photoURL = usuarioActual.photo_url;

      // 1) Subir foto si el usuario eligió una nueva
      if (nuevaFotoArchivo) {
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFotoArchivo, { upsert: true });

        if (uploadErr) {
          console.error(uploadErr);
          alert("Error al subir la foto");
        } else {
          const { data: urlData } =
            sb.storage.from("avatars").getPublicUrl(fileName);
          photoURL = urlData.publicUrl;
        }
      }

      // 2) Actualizar datos básicos en BD
      const nuevoNombre = nombreInput.value.trim();
      const nuevoTelefono = telefonoInput.value.trim();

      await sb.from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: photoURL
        })
        .eq("id", user.id);

      // 3) Cambiar contraseña si el bloque está visible y hay datos
      if (bloquePassword.style.display === "block") {
        const oldVal = oldPassword.value.trim();
        const newVal = newPassword.value.trim();
        const confVal = passConfirm.value.trim();

        if (newVal || confVal || oldVal) {
          if (!newVal || newVal.length < 6) {
            errorNewPass.textContent = "Mínimo 6 caracteres";
            throw new Error("Password inválida");
          }
          if (newVal !== confVal) {
            errorConfirmPass.textContent = "Las contraseñas no coinciden";
            throw new Error("Confirmación inválida");
          }

          // Supabase no necesita la contraseña vieja para updateUser,
          // solo requiere que haya sesión válida.
          const { error: passErr } = await sb.auth.updateUser({
            password: newVal
          });

          if (passErr) {
            console.error(passErr);
            errorNewPass.textContent = "No se pudo actualizar la contraseña";
            throw passErr;
          }

          // limpiar inputs de contraseña
          oldPassword.value = "";
          newPassword.value = "";
          passConfirm.value = "";
        }
      }

      // 4) Actualizar objeto local y guardar en LS
      usuarioActual = {
        ...usuarioActual,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: photoURL
      };
      guardarUsuarioLS(usuarioActual);

      // 5) Notificar al menú global
      document.dispatchEvent(
        new CustomEvent("userPhotoUpdated", { detail: { photo_url: photoURL } })
      );
      document.dispatchEvent(new CustomEvent("userDataUpdated"));

      alert("Datos actualizados correctamente");

    } catch (err) {
      console.error("❌ Error al guardar perfil:", err);
    } finally {
      stopLoading();
    }
  });

});
