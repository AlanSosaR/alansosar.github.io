// ============================================================
// PERFIL — VERSIÓN FINAL 2025 (LocalStorage + Sesión Real)
// ============================================================

console.log("🔥 PERFIL.JS INICIÓ");

// ============================================================
// LEER PERFIL DESDE LOCALSTORAGE (INMEDIATO)
// ============================================================
function cargarDesdeLocalStorage() {
  const raw = localStorage.getItem("cortero_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pintarPerfil(data) {
  if (!data) return;

  document.getElementById("nombreInput").value = data.name || "";
  document.getElementById("correoInput").value = data.email || "";
  document.getElementById("telefonoInput").value = data.phone || "";
  document.getElementById("fotoPerfil").src = data.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado desde localStorage:", data);
}

// ============================================================
// ESPERAR SUPABASE + SESIÓN REAL
// ============================================================
async function esperarSupabase() {
  let x = 0;
  while (!window.supabaseClient && x < 50) {
    await new Promise(res => setTimeout(res, 50));
    x++;
  }
}

async function esperarSesionReal() {
  let x = 0;
  while (x < 60) {
    const { data } = await window.supabaseClient.auth.getSession();
    if (data?.session?.user) return data.session.user;

    await new Promise(res => setTimeout(res, 50));
    x++;
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {

  // 1) PINTAR DATOS INMEDIATAMENTE DESDE LOCALSTORAGE
  const localUser = cargarDesdeLocalStorage();
  pintarPerfil(localUser);

  // 2) ESPERAR SUPABASE
  console.log("⏳ Esperando Supabase…");
  await esperarSupabase();

  // 3) ESPERAR SESIÓN REAL
  console.log("⏳ Esperando sesión real…");
  const supaUser = await esperarSesionReal();

  if (!supaUser) {
    console.log("❌ No hay sesión real, redirigiendo…");
    window.location.href = "login.html";
    return;
  }

  const sb = window.supabaseClient;

  // 4) CARGAR DATOS COMPLETOS DESDE BD
  console.log("📡 Cargando datos de la BD…");
  const { data: info, error } = await sb
    .from("users")
    .select("*")
    .eq("id", supaUser.id)
    .single();

  if (error) {
    console.error("❌ Error obteniendo perfil:", error);
    return;
  }

  // 5) PINTAR PERFIL + GUARDAR
  pintarPerfil(info);
  localStorage.setItem("cortero_user", JSON.stringify(info));
  localStorage.setItem("cortero_logged", "1");

  // ============================================================
  // FOTO
  // ============================================================
  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("inputFoto");
  const btnEditarFoto = document.getElementById("btnEditarFoto");

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;

    const fileName = `avatar_${supaUser.id}_${Date.now()}.jpg`;

    const { error } = await sb.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (error) return alert("Error al subir imagen");

    const { data: urlData } = sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    await sb.from("users")
      .update({ photo_url: urlData.publicUrl })
      .eq("id", supaUser.id);

    fotoPerfil.src = urlData.publicUrl;

    // actualizar local
    const u = cargarDesdeLocalStorage();
    u.photo_url = urlData.publicUrl;
    localStorage.setItem("cortero_user", JSON.stringify(u));

    document.dispatchEvent(new CustomEvent("userPhotoUpdated", { detail: { photo_url: urlData.publicUrl }}));
  });

  // ============================================================
  // GUARDAR DATOS BÁSICOS
  // ============================================================
  const saveBtn = document.getElementById("saveBtn");

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const newName = document.getElementById("nombreInput").value.trim();
    const newPhone = document.getElementById("telefonoInput").value.trim();

    await sb.from("users")
      .update({ name: newName, phone: newPhone })
      .eq("id", supaUser.id);

    // actualizar local
    const u = cargarDesdeLocalStorage();
    u.name = newName;
    u.phone = newPhone;
    localStorage.setItem("cortero_user", JSON.stringify(u));

    document.dispatchEvent(new CustomEvent("userDataUpdated"));
    alert("Datos actualizados");
  });

});
