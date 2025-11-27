// ============================================================
// PERFIL — Datos reales + Foto + Contraseña
// ============================================================
console.log("🔥 PERFIL.JS INICIÓ");

document.addEventListener("DOMContentLoaded", async () => {
  const sb = window.supabaseClient;
  let user = null;

  const nombreInput = document.getElementById("nombreInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const correoInput = document.getElementById("correoInput");
  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("inputFoto");
  const saveBtn = document.getElementById("saveBtn");
  const snackbar = document.getElementById("snackbar");
  const snackText = document.querySelector(".snack-text");

  function mostrarSnackbar(msg) {
    snackText.textContent = msg;
    snackbar.classList.add("show");
    setTimeout(() => snackbar.classList.remove("show"), 2600);
  }

  // ============================================================
  // CARGAR PERFIL
  // ============================================================
  async function cargarPerfil() {
    const { data } = await sb.auth.getUser();
    if (!data?.user) {
      window.location.href = "login.html";
      return;
    }

    user = data.user;

    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!info) return;

    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email || user.email;
    fotoPerfil.src = info.photo_url || "imagenes/avatar-default.svg";
  }

  await cargarPerfil();

  // ============================================================
  // CAMBIO DE FOTO
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());
  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
    const { error: uploadErr } = await sb.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadErr) return mostrarSnackbar("Error al subir la foto");

    const { data: urlData } = sb.storage.from("avatars").getPublicUrl(fileName);
    const newUrl = urlData.publicUrl;

    await sb.from("users").update({ photo_url: newUrl }).eq("id", user.id);

    fotoPerfil.src = newUrl;
    mostrarSnackbar("Foto actualizada");

    let usr = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    usr.photo_url = newUrl;
    sessionStorage.setItem("cortero_user", JSON.stringify(usr));
    document.dispatchEvent(new CustomEvent("userPhotoUpdated", { detail: { photo_url: newUrl } }));
  });

  // ============================================================
  // GUARDAR DATOS
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();

    await sb.from("users").update({
      name: nombre,
      phone: telefono
    }).eq("id", user.id);

    mostrarSnackbar("Cambios guardados");
  });
});
