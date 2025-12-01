// ============================================================
// PERFIL — VERSIÓN FINAL COMPATIBLE CON TU HTML
// ============================================================

console.log("🔥 perfil.js cargado — versión final");

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

  document.getElementById("nombreInput").value   = user.name  || "";
  document.getElementById("correoInput").value   = user.email || "";
  document.getElementById("telefonoInput").value = user.phone || "";
  document.getElementById("fotoPerfil").src      =
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

  const fotoInput       = document.getElementById("inputFoto");
  const fotoPerfil      = document.getElementById("fotoPerfil");
  const perfilForm      = document.getElementById("perfilForm");
  const saveBtn         = document.getElementById("saveBtn");
  const loader          = saveBtn.querySelector(".loader");
  const btnText         = saveBtn.querySelector(".btn-text");

  const btnMostrarPass  = document.getElementById("btnMostrarPass");
  const bloquePassword  = document.getElementById("bloquePassword");

  const currentPassword = document.getElementById("currentPassword");
  const newPassword     = document.getElementById("newPassword");
  const passConfirm     = document.getElementById("passConfirm");

  let nuevaFoto = null;

  // ============================================================
  // FOTO — LA IMAGEN ES EL BOTÓN
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFoto = file;
    fotoPerfil.src = URL.createObjectURL(file);
  });

  // ============================================================
  // MOSTRAR / OCULTAR CAMBIO DE CONTRASEÑA
  // ============================================================
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 240);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  // ============================================================
  // LOADING BTN
  // ============================================================
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

  // ============================================================
  // SUBMIT (BOTÓN GUARDAR)
  // ============================================================
  perfilForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    startLoading();

    const sb = window.supabaseClient;

    try {
      let nuevaFotoURL = user.photo_url;

      // --------------------------------------------------------
      // 1) SUBIR FOTO SI HAY
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
      // 2) ACTUALIZAR DATOS NORMALES (SIEMPRE)
      // --------------------------------------------------------
      const nuevoNombre   = document.getElementById("nombreInput").value.trim();
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
      // 3) CAMBIO DE CONTRASEÑA (ONLY IF ACTIVE)
      // --------------------------------------------------------
      if (bloquePassword.style.display === "block") {
        
        const old = currentPassword.value.trim();
        const n1  = newPassword.value.trim();
        const n2  = passConfirm.value.trim();

        if (old || n1 || n2) {

          if (!old) {
            alert("Debes escribir tu contraseña actual.");
            throw new Error("No old password");
          }

          if (n1.length < 6) {
            alert("La nueva contraseña debe tener mínimo 6 caracteres.");
            throw new Error("Short password");
          }

          if (n1 !== n2) {
            alert("Las contraseñas nuevas no coinciden.");
            throw new Error("No coinciden");
          }

          const { error: passErr } = await sb.auth.updateUser({
            password: n1,
          });

          if (passErr) throw passErr;
        }
      }

      // --------------------------------------------------------
      // 4) ACTUALIZAR LOCAL STORAGE
      // --------------------------------------------------------
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
      alert("Error guardando los cambios");
    }

    stopLoading();
  });
});
