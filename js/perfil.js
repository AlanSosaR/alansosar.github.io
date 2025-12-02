// ============================================================
// PERFIL — VERSIÓN FINAL ESTABLE CORREGIDA
// ============================================================

console.log("🔥 perfil.js — correcion");

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
  const span = bar.querySelector(".snack-text");
  span.textContent = texto;

  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2600);
}

// ------------------------------------------------------------
// PINTAR PERFIL (CORREGIDO)
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
  if (!user) return (window.location.href = "login.html");

  paintProfile(user);

  const sb = window.supabaseClient;

  // ELEMENTOS
  const fotoInput      = document.getElementById("inputFoto");
  const fotoPerfil     = document.getElementById("fotoPerfil");
  const saveBtn        = document.getElementById("saveBtn");
  const loader         = saveBtn.querySelector(".loader");
  const btnText        = saveBtn.querySelector(".btn-text");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const oldPassword = document.getElementById("oldPassword");
  const newPassword = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  let nuevaFoto = null;

  // FOTO
  fotoPerfil.onclick = () => fotoInput.click();

  fotoInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFoto = file;
    fotoPerfil.src = URL.createObjectURL(file);
  };

  // MOSTRAR OCULTAR PASS
  btnMostrarPass.onclick = () => {
    const visible = bloquePassword.style.display === "block";
    bloquePassword.style.display = visible ? "none" : "block";
    bloquePassword.style.opacity = visible ? "0" : "1";
  };

  // LOADING
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

  // GUARDAR
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();

    try {
      let nuevaFotoURL = user.photo_url;

      // SUBIR FOTO (SI HAY)
      if (nuevaFoto) {
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

        const { error } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFoto, { upsert: true });

        if (error) throw error;

        const { data: publicURL } = sb.storage
          .from("avatars")
          .getPublicUrl(fileName);

        nuevaFotoURL = publicURL.publicUrl;
      }

      // DATOS NORMALES
      const nuevoNombre   = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document.getElementById("telefonoInput").value.trim();

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

      if (updateErr) throw updateErr;

      // CAMBIO CONTRASEÑA
      if (bloquePassword.style.display === "block") {
        const old = oldPassword.value.trim();
        const n1  = newPassword.value.trim();
        const n2  = passConfirm.value.trim();

        if (n1 !== "" || n2 !== "" || old !== "") {
          if (!old) throw new Error("Debes escribir tu contraseña actual");
          if (n1.length < 6) throw new Error("Contraseña mínima 6 caracteres");
          if (n1 !== n2) throw new Error("Las contraseñas no coinciden");

          const { error: passErr } = await sb.auth.updateUser({
            password: n1,
          });

          if (passErr) throw passErr;
        }
      }

      // LOCAL STORAGE
      saveUserLS({
        ...user,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      });

      showSnack("Cambios guardados ✔️");

    } catch (err) {
      console.error("❌ Error:", err);
      showSnack("Error guardando cambios");
    }

    stopLoading();
  });

});
