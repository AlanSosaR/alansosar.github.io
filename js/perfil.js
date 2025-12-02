// ============================================================
// PERFIL — VERSIÓN ULTRA SIMPLE Y ESTABLE
// ============================================================

console.log("🔥 perfil.js — versión REAL estable");

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
    console.warn("⚠️ No se encontró #snackbar");
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

  const nombreInput   = document.getElementById("nombreInput");
  const correoInput   = document.getElementById("correoInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const fotoPerfil    = document.getElementById("fotoPerfil");

  if (nombreInput)   nombreInput.value   = user.name  || "";
  if (correoInput)   correoInput.value   = user.email || "";
  if (telefonoInput) telefonoInput.value = user.phone || "";
  if (fotoPerfil)    fotoPerfil.src      = user.photo_url || "imagenes/avatar-default.svg";
}

// ============================================================
// INICIALIZAR TODO (sin DOMContentLoaded, ya que el script va
// AL FINAL del body)
// ============================================================

(function initPerfil() {
  console.log("⚙️ Iniciando pantalla de perfil…");

  const user = getUserLS();
  if (!user) {
    console.warn("⚠️ No hay usuario en LS, redirigiendo a login");
    window.location.href = "login.html";
    return;
  }

  paintProfile(user);

  const sb = window.supabaseClient;
  if (!sb) {
    console.error("❌ window.supabaseClient es undefined");
    showSnack("Error inicializando Supabase");
    return;
  }

  // === ELEMENTOS DEL DOM ===
  const fotoInput      = document.getElementById("inputFoto");
  const fotoPerfil     = document.getElementById("fotoPerfil");
  const saveBtn        = document.getElementById("saveBtn");
  const loader         = saveBtn ? saveBtn.querySelector(".loader") : null;
  const btnText        = saveBtn ? saveBtn.querySelector(".btn-text") : null;

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const oldPassword    = document.getElementById("oldPassword");
  const newPassword    = document.getElementById("newPassword");
  const passConfirm    = document.getElementById("passConfirm");

  if (!saveBtn) {
    console.error("❌ No se encontró el botón #saveBtn");
    return;
  }

  console.log("✅ saveBtn encontrado:", saveBtn);

  let nuevaFoto = null;

  // ----------------------------------------------------------
  // FOTO — LA IMAGEN ES EL BOTÓN
  // ----------------------------------------------------------
  if (fotoPerfil && fotoInput) {
    fotoPerfil.onclick = () => fotoInput.click();

    fotoInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      nuevaFoto = file;
      fotoPerfil.src = URL.createObjectURL(file);
      console.log("📸 Nueva foto seleccionada");
    };
  }

  // ----------------------------------------------------------
  // MOSTRAR / OCULTAR CAMBIO DE CONTRASEÑA
  // ----------------------------------------------------------
  if (btnMostrarPass && bloquePassword) {
    btnMostrarPass.onclick = () => {
      const visible = window.getComputedStyle(bloquePassword).display !== "none";
      if (visible) {
        bloquePassword.style.opacity = "0";
        setTimeout(() => (bloquePassword.style.display = "none"), 200);
      } else {
        bloquePassword.style.display = "block";
        setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
      }
    };
  }

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // CLICK EN GUARDAR
  // ----------------------------------------------------------
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("🟢 CLICK en Guardar cambios");
    startLoading();

    try {
      let nuevaFotoURL = user.photo_url || null;

      // 1) SUBIR FOTO (solo si el usuario escogió una nueva)
      if (nuevaFoto) {
        console.log("📤 Subiendo nueva foto al bucket avatars…");
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

      // 2) ACTUALIZAR DATOS NORMALES
      const nombreInput   = document.getElementById("nombreInput");
      const telefonoInput = document.getElementById("telefonoInput");

      const nuevoNombre   = nombreInput   ? nombreInput.value.trim()   : "";
      const nuevoTelefono = telefonoInput ? telefonoInput.value.trim() : "";

      console.log("✏️ Actualizando datos en tabla users…");

      const { data: updated, error: updateErr } = await sb
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

      console.log("✅ Datos actualizados en Supabase:", updated);

      // 3) CAMBIO DE CONTRASEÑA (solo si el bloque está visible)
      if (bloquePassword && window.getComputedStyle(bloquePassword).display !== "none") {
        console.log("🔐 Procesando cambio de contraseña…");

        const old = oldPassword ? oldPassword.value.trim() : "";
        const n1  = newPassword ? newPassword.value.trim() : "";
        const n2  = passConfirm ? passConfirm.value.trim() : "";

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

          const { error: passErr } = await sb.auth.updateUser({ password: n1 });

          if (passErr) {
            console.error("❌ Error cambiando contraseña:", passErr);
            showSnack("Error al cambiar la contraseña");
            throw passErr;
          }

          console.log("✅ Contraseña actualizada correctamente");
        }
      }

      // 4) ACTUALIZAR LOCAL STORAGE
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
      console.error("❌ Error guardando perfil:", err);
      showSnack("Error guardando cambios");
    }

    stopLoading();
  });

  console.log("✅ Handler de click en Guardar conectado.");
})();
