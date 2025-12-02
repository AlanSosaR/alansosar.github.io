// ============================================================
// PERFIL — VERSIÓN 13 CON LOGS DETALLADOS
// ============================================================

console.log("🔥 perfil.js version 13 — debug completo");

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
// SNACKBAR
// ------------------------------------------------------------
function showSnack(texto) {
  const bar = document.getElementById("snackbar");
  if (!bar) {
    console.warn("⚠️ No se encontró el snackbar en el DOM");
    return;
  }
  const span = bar.querySelector(".snack-text");
  if (span) span.textContent = texto;

  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2600);
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
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {

  const user = getUserLS();
  if (!user) {
    console.warn("⚠️ No hay usuario en LS, redirigiendo a login");
    window.location.href = "login.html";
    return;
  }

  paintProfile(user);

  const fotoInput       = document.getElementById("inputFoto");
  const fotoPerfil      = document.getElementById("fotoPerfil");
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
  fotoPerfil.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFoto = file;
    fotoPerfil.src = URL.createObjectURL(file);
    console.log("📸 Nueva foto seleccionada");
  });

  // ============================================================
  // MOSTRAR / OCULTAR CAMBIO DE CONTRASEÑA
  // ============================================================
  btnMostrarPass.addEventListener("click", () => {
    const visible = window.getComputedStyle(bloquePassword).display !== "none";
    if (visible) {
      console.log("🔒 Ocultando bloque de contraseña");
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 240);
    } else {
      console.log("🔓 Mostrando bloque de contraseña");
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  // ============================================================
  // LOADING BTN
  // ============================================================
  function startLoading() {
    if (loader) {
      loader.style.display = "inline-block";
      loader.style.opacity = "1";
    }
    if (btnText) btnText.style.opacity = "0";
    saveBtn.disabled = true;
  }

  function stopLoading() {
    if (loader) {
      loader.style.display = "none";
      loader.style.opacity = "0";
    }
    if (btnText) btnText.style.opacity = "1";
    saveBtn.disabled = false;
  }

  // ============================================================
  // CLICK EN BOTÓN GUARDAR
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("🟢 click en Guardar cambios");
    showSnack("Guardando cambios...");
    startLoading();

    const sb = window.supabaseClient;

    if (!sb) {
      console.error("❌ window.supabaseClient es undefined");
      showSnack("Error: Supabase no está inicializado");
      stopLoading();
      return;
    }

    try {
      let nuevaFotoURL = user.photo_url;

      // --------------------------------------------------------
      // 1) SUBIR FOTO SI HAY
      // --------------------------------------------------------
      if (nuevaFoto) {
        console.log("📤 Subiendo nueva foto al bucket avatars...");
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFoto, { upsert: true });

        if (uploadErr) {
          console.error("❌ Error subiendo foto:", uploadErr);
          showSnack("Error al subir la foto de perfil");
          throw uploadErr;
        }

        const { data: publicData, error: publicErr } = sb.storage
          .from("avatars")
          .getPublicUrl(fileName);

        if (publicErr) {
          console.error("❌ Error obteniendo URL pública:", publicErr);
          showSnack("Error al obtener la foto de perfil");
          throw publicErr;
        }

        nuevaFotoURL = publicData.publicUrl;
        console.log("✅ Foto subida. URL pública:", nuevaFotoURL);
      }

      // --------------------------------------------------------
      // 2) ACTUALIZAR DATOS NORMALES
      // --------------------------------------------------------
      const nuevoNombre   = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document.getElementById("telefonoInput").value.trim();

      console.log("✏️ Actualizando datos en tabla users...", {
        id: user.id,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      });

      const { data: updateData, error: updateErr } = await sb
        .from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: nuevaFotoURL,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateErr) {
        console.error("❌ Error en UPDATE de users:", updateErr);
        showSnack("Error al guardar tus datos");
        throw updateErr;
      }

      console.log("✅ Datos actualizados en Supabase:", updateData);

      // --------------------------------------------------------
      // 3) CAMBIO DE CONTRASEÑA (SI BLOQUE VISIBLE)
      // --------------------------------------------------------
      if (window.getComputedStyle(bloquePassword).display !== "none") {
        console.log("🔐 Procesando cambio de contraseña...");

        const old = oldPassword.value.trim();
        const n1  = newPassword.value.trim();
        const n2  = passConfirm.value.trim();

        if (old || n1 || n2) {

          if (!old) {
            showSnack("Escribe tu contraseña actual.");
            throw new Error("No old password");
          }

          if (n1.length < 6) {
            showSnack("La nueva contraseña debe tener mínimo 6 caracteres.");
            throw new Error("Short password");
          }

          if (n1 !== n2) {
            showSnack("Las contraseñas nuevas no coinciden.");
            throw new Error("No coinciden");
          }

          const { error: passErr } = await sb.auth.updateUser({
            password: n1,
          });

          if (passErr) {
            console.error("❌ Error cambiando contraseña:", passErr);
            showSnack("Error al cambiar la contraseña");
            throw passErr;
          }

          console.log("✅ Contraseña actualizada correctamente");
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
      console.log("💾 LocalStorage actualizado:", actualizado);

      showSnack("Cambios guardados correctamente ✔️");

    } catch (err) {
      console.error("❌ Error guardando perfil (catch):", err);
      // Si ya se mostró un mensaje más específico antes, este es genérico
      showSnack("Error guardando cambios");
    }

    stopLoading();
  });
});
