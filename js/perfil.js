// ============================================================
// PERFIL — VERSIÓN FINAL 2025
// Foto vista previa + subida real + contraseña + sincronización
// ============================================================

console.log("🔥 perfil.js cargado");

// ============================================================
// HELPERS LOCALSTORAGE
// ============================================================
function leerUsuarioLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

function guardarUsuarioLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

// Pintar los datos en los inputs
function pintarPerfil(data) {
  if (!data) return;

  document.getElementById("nombreInput").value = data.name || "";
  document.getElementById("correoInput").value = data.email || "";
  document.getElementById("telefonoInput").value = data.phone || "";
  document.getElementById("fotoPerfil").src =
    data.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado:", data);
}

// ============================================================
// ESPERAR SUPABASE + SESIÓN REAL
// ============================================================
async function esperarSupabase() {
  let i = 0;
  while (!window.supabaseClient && i < 100) {
    await new Promise((res) => setTimeout(res, 40));
    i++;
  }
}

async function esperarSesionReal() {
  let i = 0;
  while (i < 100) {
    const { data } = await window.supabaseClient.auth.getSession();
    if (data?.session?.user) return data.session.user;

    await new Promise((res) => setTimeout(res, 40));
    i++;
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Pintar con datos del LS mientras llega la BD
  pintarPerfil(leerUsuarioLS());

  // Obtener elementos
  const fotoInput = document.getElementById("inputFoto");
  const fotoPerfil = document.getElementById("fotoPerfil");
  const btnEditarFoto = document.getElementById("btnEditarFoto");

  const saveBtn = document.getElementById("saveBtn");
  const loader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const newPassword = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  const errorOldPass = document.getElementById("errorOldPass");
  const errorNewPass = document.getElementById("errorNewPass");
  const errorConfirmPass = document.getElementById("errorConfirmPass");

  // Loader helpers
  function startLoading() {
    loader.style.display = "inline-block";
    btnText.style.opacity = "0";
  }
  function stopLoading() {
    loader.style.display = "none";
    btnText.style.opacity = "1";
  }

  console.log("⏳ Esperando Supabase…");
  await esperarSupabase();
  const sb = window.supabaseClient;

  console.log("⏳ Restaurando sesión…");
  const sessionUser = await esperarSesionReal();
  if (!sessionUser) return (window.location.href = "login.html");

  // Cargar BD
  console.log("📡 Cargando datos desde la BD…");
  const { data: info } = await sb
    .from("users")
    .select("*")
    .eq("id", sessionUser.id)
    .single();

  let usuarioActual =
    info ||
    leerUsuarioLS() || {
      id: sessionUser.id,
      email: sessionUser.email,
      name: "",
      phone: "",
      photo_url: "imagenes/avatar-default.svg",
    };

  pintarPerfil(usuarioActual);
  guardarUsuarioLS(usuarioActual);

  // ============================================================
  // FOTO — VISTA PREVIA
  // ============================================================
  let nuevaFotoArchivo = null;

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFotoArchivo = file;
    fotoPerfil.src = URL.createObjectURL(file);
  });

  // ============================================================
  // CONTRASEÑA — Mostrar/Ocultar bloque
  // ============================================================
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 250);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  function limpiarErrores() {
    errorOldPass.textContent = "";
    errorNewPass.textContent = "";
    errorConfirmPass.textContent = "";
  }

  // ============================================================
  // GUARDAR CAMBIOS (FOTO + DATOS + CONTRASEÑA)
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();
    limpiarErrores();

    try {
      let nuevaFotoURL = usuarioActual.photo_url;

      // ------------------------------------------------------------
      // 1) SUBIR FOTO (CORREGIDO: SE USA await correctamente)
      // ------------------------------------------------------------
      if (nuevaFotoArchivo) {
        const fileName = `avatar_${usuarioActual.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFotoArchivo, { upsert: true });

        if (!uploadErr) {
          const { data: urlData } = await sb.storage
            .from("avatars")
            .getPublicUrl(fileName);

          nuevaFotoURL = urlData.publicUrl;
        }
      }

      // ------------------------------------------------------------
      // 2) GUARDAR NOMBRE + TEL + FOTO
      // ------------------------------------------------------------
      const nuevoNombre = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document
        .getElementById("telefonoInput")
        .value.trim();

      await sb
        .from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: nuevaFotoURL,
        })
        .eq("id", usuarioActual.id);

      // ------------------------------------------------------------
      // 3) CONTRASEÑA
      // ------------------------------------------------------------
      if (bloquePassword.style.display === "block") {
        const n1 = newPassword.value.trim();
        const n2 = passConfirm.value.trim();

        if (n1 || n2) {
          if (n1.length < 6) {
            errorNewPass.textContent = "Mínimo 6 caracteres";
            throw "Error contraseña";
          }
          if (n1 !== n2) {
            errorConfirmPass.textContent = "Las contraseñas no coinciden";
            throw "Error contraseña";
          }

          const { error: passErr } = await sb.auth.updateUser({
            password: n1,
          });

          if (passErr) {
            errorNewPass.textContent = "No se pudo actualizar la contraseña";
            throw "Error contraseña";
          }
        }
      }

      // ------------------------------------------------------------
      // 4) ACTUALIZAR LOCAL + NOTIFICAR MENÚ
      // ------------------------------------------------------------
      usuarioActual = {
        ...usuarioActual,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      };

      guardarUsuarioLS(usuarioActual);

      document.dispatchEvent(
        new CustomEvent("userPhotoUpdated", {
          detail: { photo_url: nuevaFotoURL },
        })
      );
      document.dispatchEvent(new CustomEvent("userDataUpdated"));

      alert("Datos actualizados correctamente");
    } catch (err) {
      console.error("❌ Error guardando:", err);
    }

    stopLoading();
  });
});
