// ============================================================
// PERFIL.JS — FINAL 2025 (Compatible con core-scripts-v3 + localStorage)
// ============================================================

console.log("🔥 PERFIL.JS INICIÓ");

document.addEventListener("DOMContentLoaded", async () => {

  // Esperar a que Supabase exista
  let t = 0;
  while (!window.supabaseClient && t < 50) {
    await new Promise(r => setTimeout(r, 50));
    t++;
  }

  const sb = window.supabaseClient;

  // ============================================================
  // OBTENER SESIÓN REAL DESDE SUPABASE (localStorage)
  // ============================================================
  async function obtenerSesionReal() {
    let intentos = 0;
    while (intentos < 50) {
      const { data } = await sb.auth.getSession();
      if (data?.session?.user) return data.session.user;
      intentos++;
      await new Promise(r => setTimeout(r, 50));
    }
    return null;
  }

  const user = await obtenerSesionReal();

  if (!user) {
    console.log("❌ No hay sesión → login.html");
    window.location.href = "login.html";
    return;
  }

  console.log("🟢 Sesión detectada:", user);

  // ELEMENTOS
  const nombreInput   = document.getElementById("nombreInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const correoInput   = document.getElementById("correoInput");
  const fotoPerfil    = document.getElementById("fotoPerfil");
  const fotoInput     = document.getElementById("inputFoto");
  const saveBtn       = document.getElementById("saveBtn");
  const snackbar      = document.getElementById("snackbar");
  const snackText     = document.querySelector(".snack-text");

  function snackbarMsg(msg) {
    snackText.textContent = msg;
    snackbar.classList.add("show");
    setTimeout(() => snackbar.classList.remove("show"), 2600);
  }

  // ============================================================
  // CARGAR PERFIL DESDE LA TABLA USERS
  // ============================================================
  async function cargarPerfil() {
    console.log("📡 Cargando datos desde users…");

    const { data: info } = await sb
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    console.log("🟢 Datos recibidos:", info);

    if (!info) return;

    nombreInput.value   = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value   = info.email || user.email;
    fotoPerfil.src      = info.photo_url || "imagenes/avatar-default.svg";
  }

  await cargarPerfil();

  // ============================================================
  // SUBIR FOTO
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

    const { error: upErr } = await sb
      .storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (upErr) return snackbarMsg("Error al subir foto");

    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = urlData.publicUrl;

    await sb
      .from("users")
      .update({ photo_url: newUrl })
      .eq("id", user.id);

    fotoPerfil.src = newUrl;
    snackbarMsg("Foto actualizada");
  });

  // ============================================================
  // GUARDAR NOMBRE + TELÉFONO
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

    snackbarMsg("Cambios guardados");
  });
});
