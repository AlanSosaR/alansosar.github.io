// ============================================================
// PERFIL — VERSIÓN FINAL 2025 (FUNCIONA CON TU HTML ACTUAL)
// ============================================================

console.log("🔥 perfil.js cargado — versión FINAL");

// ------------------------------------------------------------
// LOCAL STORAGE
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// PINTAR PERFIL
// ------------------------------------------------------------
function paintProfile(user) {
  if (!user) return;

  document.getElementById("nombreInput").value = user.name || "";
  document.getElementById("correoInput").value = user.email || "";
  document.getElementById("telefonoInput").value = user.phone || "";
  document.getElementById("fotoPerfil").src =
    user.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado:", user);
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const user = getUserLS();
  if (!user) return (window.location.href = "login.html");

  paintProfile(user);

  const fotoInput      = document.getElementById("inputFoto");
  const fotoPerfil     = document.getElementById("fotoPerfil");
  const btnEditarFoto  = document.getElementById("btnEditarFoto");

  const perfilForm     = document.getElementById("perfilForm");
  const saveBtn        = document.getElementById("saveBtn");
  const loader         = saveBtn.querySelector(".loader");
  const btnText        = saveBtn.querySelector(".btn-text");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const newPassword = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");
  const errorNewPass = document.getElementById("errorNewPass");
  const errorConfirmPass = document.getElementById("errorConfirmPass");

  let nuevaFoto = null;

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

  // ------------------------------------------------------------
  // FOTO — PREVIEW
  // ------------------------------------------------------------
  btnEditarFoto.addEventListener("click", () => fotoInput.click());
  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFoto = file;
    fotoPerfil.src = URL.createObjectURL(file);
  });

  // ------------------------------------------------------------
  // MOSTRAR / OCULTAR CONTRASEÑA
  // ------------------------------------------------------------
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 240);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  // ------------------------------------------------------------
  // GUARDAR CAMBIOS — SUBMIT FORM (NO CLICK)
  // ------------------------------------------------------------
  perfilForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    startLoading();

    const sb = window.supabaseClient;

    try {
      let nuevaFotoURL = user.photo_url;

      // --------------------------------------------------------
      // SUBIR FOTO
      // --------------------------------------------------------
      if (nuevaFoto) {
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFoto, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data } = await sb.storage
          .from("avatars")
          .getPublicUrl(fileName);

        nuevaFotoURL = data.publicUrl;
      }

      // --------------------------------------------------------
      // ACTUALIZAR BD
      // --------------------------------------------------------
      const nuevoNombre = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document.getElementById("telefonoInput").value.trim();

      const { error: updateErr } = await sb
        .from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: nuevaFotoURL,
        })
        .eq("id", user.id);

      if (updateErr) throw updateErr;

      // --------------------------------------------------------
      // CONTRASEÑA
      // --------------------------------------------------------
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

          const { error: passErr } = await sb.auth.updateUser({ password: n1 });
          if (passErr) throw passErr;
        }
      }

      // --------------------------------------------------------
      // ACTUALIZAR LOCALSTORAGE
      // --------------------------------------------------------
      const actualizado = {
        ...user,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      };

      saveUserLS(actualizado);

      // --------------------------------------------------------
      // AVISAR A TODO EL SISTEMA DEL CAMBIO
      // --------------------------------------------------------
      document.dispatchEvent(
        new CustomEvent("userProfileManuallyUpdated", { detail: actualizado })
      );

      document.dispatchEvent(
        new CustomEvent("userPhotoUpdated", {
          detail: { photo_url: nuevaFotoURL },
        })
      );

      document.dispatchEvent(new CustomEvent("userDataUpdated"));

      alert("Datos actualizados correctamente");
    } catch (err) {
      console.error("❌ Error guardando perfil:", err);
      alert("Error al guardar los cambios");
    }

    stopLoading();
  });
});
