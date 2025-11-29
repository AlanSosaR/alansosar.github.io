// ============================================================
// PERFIL — VERSIÓN FINAL 2025
// Usa únicamente el JSON ya cargado al iniciar sesión
// ============================================================

console.log("🔥 perfil.js cargado");

// ============================================================
// LEER / GUARDAR LOCALSTORAGE
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

// ============================================================
// PINTAR PERFIL
// ============================================================
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
// MAIN
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  
  // ============================================================
  // 1️⃣ LEER EL JSON QUE YA TRAJO LOGIN
  // ============================================================
  const usuarioActual = leerUsuarioLS();

  if (!usuarioActual) {
    console.log("❌ No hay usuario en LS → ir al login");
    return (window.location.href = "login.html");
  }

  // Pintar directo sin esperar nada
  pintarPerfil(usuarioActual);

  // ============================================================
  // Obtener elementos
  // ============================================================
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

  // Usar cliente global ya inicializado
  const sb = window.supabaseClient;

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
  // CONTRASEÑA — Mostrar/Ocultar
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
    errorNewPass.textContent = "";
    errorConfirmPass.textContent = "";
  }

  // ============================================================
  // GUARDAR CAMBIOS
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();
    limpiarErrores();

    try {
      let nuevaFotoURL = usuarioActual.photo_url;

      // ------------------------------------------------------------
      // 1) SUBIR FOTO
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
      // 2) GUARDAR NOMBRE + TEL + FOTO EN BD
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
            errorConfirmPass.textContent = "No coinciden";
            throw "Error contraseña";
          }

          await sb.auth.updateUser({ password: n1 });
        }
      }

      // ------------------------------------------------------------
      // 4) ACTUALIZAR LOCAL
      // ------------------------------------------------------------
      const actualizado = {
        ...usuarioActual,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      };

      guardarUsuarioLS(actualizado);

      document.dispatchEvent(
        new CustomEvent("userPhotoUpdated", {
          detail: { photo_url: nuevaFotoURL },
        })
      );

      alert("Datos actualizados correctamente");

    } catch (err) {
      console.error("❌ Error guardando:", err);
    }

    stopLoading();
  });
});
