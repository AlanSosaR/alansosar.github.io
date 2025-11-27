// ============================================================
// PERFIL — FIX DEFINITIVO 2025 (Funciona 100%)
// Espera sesión real antes de cargar el perfil
// ============================================================

console.log("🔥 PERFIL.JS INICIÓ");

// Esperar a que Supabase exista
async function esperarSupabase() {
  let intentos = 0;
  while (!window.supabaseClient && intentos < 50) {
    await new Promise(res => setTimeout(res, 50));
    intentos++;
  }
}

async function esperarSesionReal() {
  let intentos = 0;

  while (intentos < 60) { // hasta 3 segundos
    const { data } = await window.supabaseClient.auth.getSession();

    if (data?.session?.user) {
      console.log("🟢 Sesión final restaurada:", data.session.user);
      return data.session.user;
    }
    await new Promise(res => setTimeout(res, 50));
    intentos++;
  }

  console.warn("⚠ No hubo sesión después de esperar.");
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {

  console.log("⏳ Esperando Supabase…");
  await esperarSupabase();

  console.log("⏳ Esperando sesión real…");
  const user = await esperarSesionReal();

  if (!user) {
    console.log("❌ No hay sesión, redirigiendo…");
    window.location.href = "login.html";
    return;
  }

  const sb = window.supabaseClient;

  const nombreInput = document.getElementById("nombreInput");
  const telefonoInput = document.getElementById("telefonoInput");
  const correoInput = document.getElementById("correoInput");
  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("inputFoto");
  const saveBtn = document.getElementById("saveBtn");

  // ============================================================
  // CARGAR PERFIL DESDE BD
  // ============================================================
  console.log("📡 Cargando datos de la BD…");

  const { data: info } = await sb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  console.log("🟢 Datos obtenidos:", info);

  if (info) {
    nombreInput.value = info.name || "";
    telefonoInput.value = info.phone || "";
    correoInput.value = info.email || user.email;
    fotoPerfil.src = info.photo_url || "imagenes/avatar-default.svg";
  }

  // ============================================================
  // ACTUALIZAR FOTO
  // ============================================================
  fotoPerfil.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

    const { error } = await sb.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (error) return alert("Error al subir imagen");

    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    await sb.from("users")
      .update({ photo_url: urlData.publicUrl })
      .eq("id", user.id);

    fotoPerfil.src = urlData.publicUrl;
    alert("Foto actualizada");
  });

  // ============================================================
  // GUARDAR CAMBIOS
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    await sb.from("users")
      .update({
        name: nombreInput.value.trim(),
        phone: telefonoInput.value.trim(),
      })
      .eq("id", user.id);

    alert("Datos actualizados");
  });

});
