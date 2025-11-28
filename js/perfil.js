// ============================================================
// PERFIL — VERSIÓN FINAL 2025 (LocalStorage + Sesión Real)
// ============================================================

console.log("🔥 PERFIL.JS INICIÓ");

// ============================================================
// LEER PERFIL DESDE LOCALSTORAGE
// ============================================================
function cargarDesdeLocalStorage() {
  const raw = localStorage.getItem("cortero_user");
  if (!raw) return null;

  try { return JSON.parse(raw); }
  catch { return null; }
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

  // 1) Mostrar datos RAPIDAMENTE desde localStorage
  const localUser = cargarDesdeLocalStorage();
  pintarPerfil(localUser);

  // 2) Esperar Supabase
  await esperarSupabase();

  // 3) Esperar sesión real
  const supaUser = await esperarSesionReal();

  if (!supaUser) {
    window.location.href = "login.html";
    return;
  }

  const sb = window.supabaseClient;

  // 4) Cargar desde la BD
  const { data: info } = await sb
    .from("users")
    .select("*")
    .eq("id", supaUser.id)
    .single();

  if (info) {
    pintarPerfil(info);
    localStorage.setItem("cortero_user", JSON.stringify(info));
    localStorage.setItem("cortero_logged", "1");
  }

  // ============================================================
  // FOTO — NO SUBIR HASTA GUARDAR
  // ============================================================
  const fotoPerfil = document.getElementById("fotoPerfil");
  const fotoInput = document.getElementById("inputFoto");
  const btnEditarFoto = document.getElementById("btnEditarFoto");

  let nuevaFotoFile = null; // <<< FOTO TEMPORAL

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", () => {
    const file = fotoInput.files[0];
    if (!file) return;

    nuevaFotoFile = file;

    // Vista previa inmediata
    const reader = new FileReader();
    reader.onload = () => fotoPerfil.src = reader.result;
    reader.readAsDataURL(file);

    console.log("📸 Foto seleccionada, lista para subir al guardar.");
  });

  // ============================================================
  // CAMBIAR CONTRASEÑA (Activar bloque)
// ============================================================
  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  btnMostrarPass.addEventListener("click", () => {
    bloquePassword.style.display = "block";
    setTimeout(() => bloquePassword.style.opacity = "1", 50);
  });

  // ============================================================
  // GUARDAR DATOS
  // ============================================================
  const saveBtn = document.getElementById("saveBtn");
  const loader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Activar loader
    saveBtn.classList.add("loading");
    btnText.style.opacity = "0";
    loader.style.display = "inline-block";

    let fotoURLFinal = info.photo_url;

    // SUBIR FOTO SOLO SI EL USUARIO LA CAMBIÓ
    if (nuevaFotoFile) {
      const fileName = `avatar_${supaUser.id}_${Date.now()}.jpg`;

      const { error: upErr } = await sb.storage
        .from("avatars")
        .upload(fileName, nuevaFotoFile, { upsert: true });

      if (!upErr) {
        const { data: urlData } = sb.storage
          .from("avatars")
          .getPublicUrl(fileName);

        fotoURLFinal = urlData.publicUrl;
      }
    }

    // DATOS ACTUALIZADOS
    const newName = document.getElementById("nombreInput").value.trim();
    const newPhone = document.getElementById("telefonoInput").value.trim();

    await sb.from("users")
      .update({
        name: newName,
        phone: newPhone,
        photo_url: fotoURLFinal
      })
      .eq("id", supaUser.id);

    // Actualizar LocalStorage
    const updated = {
      ...info,
      name: newName,
      phone: newPhone,
      photo_url: fotoURLFinal
    };

    localStorage.setItem("cortero_user", JSON.stringify(updated));

    // Notificar al menú
    document.dispatchEvent(new CustomEvent("userDataUpdated"));
    document.dispatchEvent(new CustomEvent("userPhotoUpdated", {
      detail: { photo_url: fotoURLFinal }
    }));

    // Desactivar loader
    saveBtn.classList.remove("loading");
    btnText.style.opacity = "1";
    loader.style.display = "none";

    alert("Cambios guardados con éxito");
  });

});
