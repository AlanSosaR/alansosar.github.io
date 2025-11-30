// ============================================================
// PERFIL — VERSIÓN NUEVA Y LIMPIA 2025
// Usa SOLO el JSON del login guardado en localStorage
// Actualiza datos en BD y actualiza foto en Storage
// ============================================================

console.log("🔥 perfil.js (NUEVO) cargado");

// ============================================================
// UTILIDADES LOCALSTORAGE
// ============================================================
function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

function saveUserLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

// ============================================================
// PINTAR DATOS DEL PERFIL
// ============================================================
function paintProfile(user) {
  if (!user) return;

  document.getElementById("nombreInput").value = user.name || "";
  document.getElementById("correoInput").value = user.email || "";
  document.getElementById("telefonoInput").value = user.phone || "";
  document.getElementById("fotoPerfil").src =
    user.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado:", user);
}

// ============================================================
// MAIN
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // 1) Obtener usuario del LS
  const user = getUserLS();
  if (!user) return (window.location.href = "login.html");

  paintProfile(user);

  // Elementos UI
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
    saveBtn.disabled = true;
  }
  function stopLoading() {
    loader.style.display = "none";
    btnText.style.opacity = "1";
    saveBtn.disabled = false;
  }

  // Elegir nueva foto
  let nuevaFoto = null;

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFoto = file;
    fotoPerfil.src = URL.createObjectURL(file);
  });

  // Mostrar / ocultar contraseña
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 240);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  // ========================================================
  // GUARDAR CAMBIOS
  // ========================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();

    const sb = window.supabaseClient;

    try {
      let nuevaFotoURL = user.photo_url;

      // -------------------------------------------------------------------
      // 1) Subir nueva foto (si hay)
      // -------------------------------------------------------------------
      if (nuevaFoto) {
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFoto, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = await sb.storage
          .from("avatars")
          .getPublicUrl(fileName);

        nuevaFotoURL = urlData.publicUrl;
      }

      // -------------------------------------------------------------------
      // 2) Actualizar datos básicos en BD
      // -------------------------------------------------------------------
      const nuevoNombre = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document
        .getElementById("telefonoInput")
        .value.trim();

      const { error: updateErr } = await sb
        .from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: nuevaFotoURL,
        })
        .eq("id", user.id);

      if (updateErr) throw updateErr;

      // -------------------------------------------------------------------
      // 3) Cambiar contraseña si se abrió el bloque
      // -------------------------------------------------------------------
      if (bloquePassword.style.display === "block") {
        const n1 = newPassword.value.trim();
        const n2 = passConfirm.value.trim();

        errorNewPass.textContent = "";
        errorConfirmPass.textContent = "";

        if (n1 || n2) {
          if (n1.length < 6) {
            errorNewPass.textContent = "Mínimo 6 caracteres";
            throw new Error("Contraseña inválida");
          }
          if (n1 !== n2) {
            errorConfirmPass.textContent = "No coinciden";
            throw new Error("Contraseña inválida");
          }

          const { error: passErr } = await sb.auth.updateUser({
            password: n1,
          });

          if (passErr) throw passErr;
        }
      }

      // -------------------------------------------------------------------
      // 4) Actualizar LocalStorage
      // -------------------------------------------------------------------
      const actualizado = {
        ...user,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      };

      saveUserLS(actualizado);

      alert("Datos actualizados correctamente");

    } catch (err) {
      console.error("❌ Error guardando perfil:", err);
      alert("Error al guardar los cambios");
    }

    stopLoading();
  });
});
