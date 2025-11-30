// ============================================================
// PERFIL — USA DIRECTAMENTE EL JSON DEL LOGIN
// Sin esperas innecesarias, sin loops, sin bugs
// ============================================================

console.log("🔥 perfil.js cargado");

// ------------------------------------------------------------
// LEER DATA REAL DEL LOGIN
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// PINTAR PERFIL
// ------------------------------------------------------------
function pintarPerfil(data) {
  if (!data) return;

  document.getElementById("nombreInput").value = data.name || "";
  document.getElementById("correoInput").value = data.email || "";
  document.getElementById("telefonoInput").value = data.phone || "";
  document.getElementById("fotoPerfil").src =
    data.photo_url || "imagenes/avatar-default.svg";

  console.log("🟢 Perfil pintado con datos del LS:", data);
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const usuario = leerUsuarioLS();

  // Si no hay sesión → login
  if (!usuario) {
    return (window.location.href = "login.html");
  }

  // Pintar inmediatamente
  pintarPerfil(usuario);

  // --------------------------------------------------------
  // OBTENER ELEMENTOS
  // --------------------------------------------------------
  const sb = window.supabaseClient;
  const fotoInput = document.getElementById("inputFoto");
  const fotoPerfil = document.getElementById("fotoPerfil");
  const btnEditarFoto = document.getElementById("btnEditarFoto");

  const saveBtn = document.getElementById("saveBtn");
  const loader = saveBtn.querySelector(".loader");
  const btnText = saveBtn.querySelector(".btn-text");

  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");

  const newPassword = document.getElementById("newPassword");
  const passConfirm = document.getElementById("passConfirm");

  const errorNewPass = document.getElementById("errorNewPass");
  const errorConfirmPass = document.getElementById("errorConfirmPass");

  function startLoading() {
    loader.style.display = "inline-block";
    btnText.style.opacity = "0";
  }
  function stopLoading() {
    loader.style.display = "none";
    btnText.style.opacity = "1";
  }

  // --------------------------------------------------------
  // FOTO — VISTA PREVIA
  // --------------------------------------------------------
  let nuevaFotoArchivo = null;

  btnEditarFoto.addEventListener("click", () => fotoInput.click());

  fotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    nuevaFotoArchivo = file;
    fotoPerfil.src = URL.createObjectURL(file);
  });

  // --------------------------------------------------------
  // CONTRASEÑA — MOSTRAR/OCULTAR
  // --------------------------------------------------------
  btnMostrarPass.addEventListener("click", () => {
    if (bloquePassword.style.display === "block") {
      bloquePassword.style.opacity = "0";
      setTimeout(() => (bloquePassword.style.display = "none"), 250);
    } else {
      bloquePassword.style.display = "block";
      setTimeout(() => (bloquePassword.style.opacity = "1"), 20);
    }
  });

  // --------------------------------------------------------
  // GUARDAR CAMBIOS
  // --------------------------------------------------------
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();

    let nuevaFotoURL = usuario.photo_url;

    try {
      // ----------------------------
      // 1) Subir foto si hay nueva
      // ----------------------------
      if (nuevaFotoArchivo) {
        const fileName = `avatar_${usuario.id}_${Date.now()}.jpg`;

        const { error: uploadErr } = await sb.storage
          .from("avatars")
          .upload(fileName, nuevaFotoArchivo, { upsert: true });

        if (!uploadErr) {
          const { data: urlData } = await sb.storage
            .from("avatars")
            .getPublicUrl(fileName);

          nuevaFotoURL = urlData.publicUrl;
        }
      }

      // ----------------------------
      // 2) Guardar datos en BD
      // ----------------------------
      const nuevoNombre = document.getElementById("nombreInput").value.trim();
      const nuevoTelefono = document.getElementById("telefonoInput").value.trim();

      await sb
        .from("users")
        .update({
          name: nuevoNombre,
          phone: nuevoTelefono,
          photo_url: nuevaFotoURL,
        })
        .eq("id", usuario.id);

      // ----------------------------
      // 3) Cambiar contraseña
      // ----------------------------
      if (bloquePassword.style.display === "block") {
        const n1 = newPassword.value.trim();
        const n2 = passConfirm.value.trim();

        if (n1.length < 6) {
          errorNewPass.textContent = "Mínimo 6 caracteres";
          throw "Error contraseña";
        }
        if (n1 !== n2) {
          errorConfirmPass.textContent = "Las contraseñas no coinciden";
          throw "Error contraseña";
        }

        await sb.auth.updateUser({ password: n1 });
      }

      // ----------------------------
      // 4) Actualizar LS
      // ----------------------------
      const actualizado = {
        ...usuario,
        name: nuevoNombre,
        phone: nuevoTelefono,
        photo_url: nuevaFotoURL,
      };

      guardarUsuarioLS(actualizado);

      alert("Datos guardados correctamente");
    } catch (err) {
      console.error("❌ Error guardando:", err);
    }

    stopLoading();
  });
});
