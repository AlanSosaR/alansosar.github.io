// ============================================================
// PERFIL — VERSIÓN FINAL 2025 (Foto vista previa, subida al guardar,
// contraseña funcional, loader OK, sincronización con menú)
// ============================================================

console.log("🔥 PERFIL.JS INICIÓ");

// ============================================================
// LOCALSTORAGE HELPERS
// ============================================================
function leerUsuarioLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

function guardarUsuarioLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

// Pintar datos al cargar
function pintarPerfil(data) {
  if (!data) return;

  document.getElementById("nombreInput").value = data.name || "";
  document.getElementById("correoInput").value = data.email || "";
  document.getElementById("telefonoInput").value = data.phone || "";
  document.getElementById("fotoPerfil").src =
    data.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado:", data);
}

// ============================================================
// ESPERAR SUPABASE Y SESIÓN REAL
// ============================================================
async function esperarSupabase() {
  let i = 0;
  while (!window.supabaseClient && i < 100) {
    await new Promise((res) => setTimeout(res, 40));
    i++;
  }
}

async function esperarSesionReal() {
  let i = 0;
  while (i < 100) {
    const { data } = await window.supabaseClient.auth.getSession();
    if (data?.session?.user) return data.session.user;

    await new Promise((res) => setTimeout(res, 40));
    i++;
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Mostrar inmediatamente desde localStorage
  pintarPerfil(leerUsuarioLS());

  // DOM
  const fotoInput = document.getElementById("inputFoto");
  const fotoPerfil = document.getElementById("fotoPerfil");
  const btnEditarFoto = document.getElementById("btnEditarFoto");

  const saveBtn = document.getElementById("saveBtn");
  const loader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const oldPassword = document.getElementById("oldPassword");
  const newPassword = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  const errorOldPass = document.getElementById("errorOldPass");
  const errorNewPass = document.getElementById("errorNewPass");
  const errorConfirmPass = document.getElementById("errorConfirmPass");

  // Loader helpers
  function startLoading() {
    loader.style.display = "inline-block";
    btnText.style.opacity = "0";
  }
  function stopLoading() {
    loader.style.display = "none";
    btnText.style.opacity = "1";
  }

  // Esperar supabase
  console.log("⏳ Esperando Supabase...");
  await esperarSupabase();
  const sb = window.supabaseClient;

  // Esperar sesión real
  console.log("⏳ Restaurando sesión...");
  const sessionUser = await esperarSesionReal();
  if (!sessionUser) return (window.location.href = "login.html");

  // Cargar datos frescos desde BD
  console.log("📡 Cargando BD…");
  const { data: info } = await sb
    .from("users")
    .select("*")
    .eq("id", sessionUser.id)
    .single();

  let usuarioActual =
    info ||
    leerUsuarioLS() || {
      id: sessionUser.id,
      email: sessionUser.email,
      name: "",
      phone: "",
      photo_url: "imagenes/avatar-default.svg",
    };

  pintarPerfil(usuarioActual);
  guardarUsuarioLS(usuarioActual);

  // ============================================================
  // FOTO – SOLO VISTA PREVIA (se sube al guardar)
  // ============================================================
  let nuevaFotoArchivo = null;

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    nuevaFotoArchivo = file;
    fotoPerfil.src = URL.createObjectURL(file); // vista previa
  });

  // ============================================================
  // CONTRASEÑA – Mostrar / ocultar bloque
  // ============================================================
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 250);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  function limpiarErrores() {
    errorOldPass.textContent = "";
    errorNewPass.textContent = "";
    errorConfirmPass.textContent = "";
  }

  // ============================================================
  // GUARDAR CAMBIOS — FOTO + DATOS + CONTRASEÑA
  // ============================================================
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();
    limpiarErrores();

    try {
      let nuevaFotoURL = usuarioActual.photo_url;

      // 1) Subir foto si se eligió una nueva
      if (nuevaFotoArchivo) {
        const fileName = `avatar_${usuarioActual.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFotoArchivo, { upsert: true });

        if (!uploadErr) {
          const { data: urlData } =
            sb.storage.from("avatars").getPublicUrl(fileName);
          nuevaFotoURL = urlData.publicUrl;
        }
      }

      // 2) Guardar nombre + teléfono + foto
      const nuevoNombre = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document
        .getElementById("telefonoInput")
        .value.trim();

      await sb
        .from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: nuevaFotoURL,
        })
        .eq("id", usuarioActual.id);

      // 3) Contraseña si el bloque está visible
      if (bloquePassword.style.display === "block") {
        const n1 = newPassword.value.trim();
        const n2 = passConfirm.value.trim();

        if (n1 || n2) {
          if (n1.length < 6)
            throw (errorNewPass.textContent = "Mínimo 6 caracteres");
          if (n1 !== n2)
            throw (errorConfirmPass.textContent = "Las contraseñas no coinciden");

          const { error: passErr } = await sb.auth.updateUser({
            password: n1,
          });

          if (passErr)
            throw (errorNewPass.textContent =
              "No se pudo actualizar la contraseña");
        }
      }

      // 4) Actualizar versión local
      usuarioActual = {
        ...usuarioActual,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      };

      guardarUsuarioLS(usuarioActual);

      // 5) Notificar menú
      document.dispatchEvent(
        new CustomEvent("userPhotoUpdated", {
          detail: { photo_url: nuevaFotoURL },
        })
      );
      document.dispatchEvent(new CustomEvent("userDataUpdated"));

      alert("Datos actualizados correctamente");
    } catch (err) {
      console.error("❌ Error guardando:", err);
    }

    stopLoading();
  });
});
