// ============================================================
// PERFIL REAL — FIX DEFINITIVO 2025
// ============================================================

// Esperar a que Supabase Client esté listo
await new Promise(resolve => {
  const check = () => {
    if (window.supabaseClient) {
      console.log("🟢 Supabase Client cargado en PERFIL.JS");
      resolve();
    } else {
      setTimeout(check, 50);
    }
  };
  check();
});

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

    console.log("⏳ Leyendo sesión...");
    const { data: sessionData } = await sb.auth.getSession();
    user = sessionData?.session?.user;

    console.log("🟢 Sesión detectada:", user);

    if (!user) {
      console.log("❌ Sin sesión. Redirigiendo...");
      window.location.href = "login.html";
      return;
    }

    console.log("📡 Cargando datos de BD...");

    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    console.log("🟢 Datos obtenidos:", info);

    if (!info) return;

    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email;
    fotoPerfil.src = info.photo_url || "imagenes/avatar-default.svg";
  }

  await cargarPerfil();

  // ============================================================
  // ACTUALIZAR FOTO
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

    const { error: uploadErr } = await sb.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadErr) return mostrarSnackbar("Error al subir foto");

    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = urlData.publicUrl;

    await sb
      .from("users")
      .update({ photo_url: newUrl })
      .eq("id", user.id);

    fotoPerfil.src = newUrl;
    mostrarSnackbar("Foto actualizada");
  });

  // ============================================================
  // GUARDAR DATOS
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    await sb
      .from("users")
      .update({
        name: nombreInput.value.trim(),
        phone: telefonoInput.value.trim()
      })
      .eq("id", user.id);

    mostrarSnackbar("Cambios guardados");
  });
});
