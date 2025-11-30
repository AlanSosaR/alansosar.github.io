// ============================================================
// PERFIL — VERSIÓN FINAL FUNCIONAL SIN BOTÓN INVISIBLE
// ============================================================

console.log("🔥 perfil.js cargado (sin overlay invisible)");

// LOCAL STORAGE
function getUserLS() {
  try { return JSON.parse(localStorage.getItem("cortero_user")) || null; }
  catch { return null; }
}
function saveUserLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

// PINTAR DATOS
function paintProfile(user) {
  document.getElementById("nombreInput").value = user.name || "";
  document.getElementById("correoInput").value = user.email || "";
  document.getElementById("telefonoInput").value = user.phone || "";
  document.getElementById("fotoPerfil").src =
    user.photo_url || "imagenes/avatar-default.svg";
}

// MAIN
document.addEventListener("DOMContentLoaded", () => {
  const user = getUserLS();
  if (!user) return location.href = "login.html";

  paintProfile(user);

  const fotoInput  = document.getElementById("inputFoto");
  const fotoPerfil = document.getElementById("fotoPerfil");

  const perfilForm = document.getElementById("perfilForm");
  const saveBtn    = document.getElementById("saveBtn");
  const loader     = saveBtn.querySelector(".loader");
  const btnText    = saveBtn.querySelector(".btn-text");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  let nuevaFoto = null;

  // FOTO COMO BOTÓN
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFoto = file;
    fotoPerfil.src = URL.createObjectURL(file);
  });

  // CONTRASEÑA
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => bloquePassword.style.display = "none", 240);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => bloquePassword.style.opacity = "1", 20);
    }
  });

  // Loader
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

  // GUARDAR CAMBIOS
  perfilForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    startLoading();

    const sb = window.supabaseClient;
    let nuevaFotoURL = user.photo_url;

    try {
      // Foto
      if (nuevaFoto) {
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
        const { error: err1 } = await sb.storage.from("avatars")
          .upload(fileName, nuevaFoto, { upsert: true });
        if (err1) throw err1;

        const { data } = await sb.storage.from("avatars").getPublicUrl(fileName);
        nuevaFotoURL = data.publicUrl;
      }

      // Base de datos
      const nombre = nombreInput.value.trim();
      const telefono = telefonoInput.value.trim();

      const { error: err2 } = await sb.from("users")
        .update({ name: nombre, phone: telefono, photo_url: nuevaFotoURL })
        .eq("id", user.id);

      if (err2) throw err2;

      // Actualizar LocalStorage
      const updated = { ...user, name: nombre, phone: telefono, photo_url: nuevaFotoURL };
      saveUserLS(updated);

      alert("Datos actualizados correctamente");

    } catch (err) {
      console.error("❌ Error perfil:", err);
      alert("Error al guardar los cambios");
    }

    stopLoading();
  });
});
