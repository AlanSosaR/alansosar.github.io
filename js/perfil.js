// ============================================================
// PERFIL — VERSIÓN FINAL 2025 SIN OVERLAY — FUNCIONANDO
// ============================================================

console.log("🔥 perfil.js cargado — versión sin overlay");

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

  const oldPassword     = document.getElementById("oldPassword");
  const newPassword     = document.getElementById("newPassword");
  const passConfirm     = document.getElementById("passConfirm");

  let nuevaFoto = null;

  // ============================================================
  // FOTO — LA IMAGEN ES EL BOTÓN
  // ============================================================
  if (fotoPerfil && fotoInput) {
    fotoPerfil.addEventListener("click", () => fotoInput.click());

    fotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      nuevaFoto = file;
      fotoPerfil.src = URL.createObjectURL(file);
    });
  }

  // ============================================================
  // TOGGLE CONTRASEÑA
  // ============================================================
  if (btnMostrarPass && bloquePassword) {
    btnMostrarPass.addEventListener("click", () => {
      if (bloquePassword.style.display === "block") {
        bloquePassword.style.opacity = "0";
        setTimeout(() => (bloquePassword.style.display = "none"), 240);
      } else {
        bloquePassword.style.display = "block";
        setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
      }
    });
  }

  // ============================================================
  // BOTÓN LOADER
  // ============================================================
  function startLoading() {
    if (loader)  loader.style.display = "inline-block";
    if (btnText) btnText.style.opacity = "0";
    saveBtn.disabled = true;
  }

  function stopLoading() {
    if (loader)  loader.style.display = "none";
    if (btnText) btnText.style.opacity = "1";
    saveBtn.disabled = false;
  }

  // ============================================================
  // SUBMIT FINAL
  // ============================================================
  if (!perfilForm) return;

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
      // 2) ACTUALIZAR DATOS BÁSICOS (SIEMPRE)
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
      // 3) CAMBIO DE CONTRASEÑA (SOLO SI EL BLOQUE ESTÁ ABIERTO
      //    Y EL USUARIO ESCRIBIÓ ALGO)
      // --------------------------------------------------------
      if (bloquePassword && bloquePassword.style.display === "block") {
        const n1 = newPassword.value.trim();
        const n2 = passConfirm.value.trim();
        const old = oldPassword.value.trim();

        if (n1 || n2 || old) {
          // Validaciones mínimas
          if (!old) {
            alert("Escribe tu contraseña actual para cambiarla.");
            throw new Error("Falta contraseña actual");
          }

          if (n1.length < 6) {
            alert("La nueva contraseña debe tener al menos 6 caracteres.");
            throw new Error("Contraseña nueva muy corta");
          }

          if (n1 !== n2) {
            alert("Las contraseñas nuevas no coinciden.");
            throw new Error("No coinciden");
          }

          // Supabase no usa 'old', pero lo pedimos por UX
          const { error: passErr } = await sb.auth.updateUser({ password: n1 });
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

      // NOTIFICAR A TODO EL SISTEMA
      document.dispatchEvent(
        new CustomEvent("userProfileManuallyUpdated", { detail: actualizado })
      );
      document.dispatchEvent(
        new CustomEvent("userPhotoUpdated", { detail: { photo_url: nuevaFotoURL }})
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
