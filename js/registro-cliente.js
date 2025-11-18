/* ============================================================
   ================  IMPORTS DE SUPABASE  ======================
   ============================================================ */
import { registerUser } from "./supabase-auth.js";
import { supabase } from "./supabase-client.js";

/* ============================================================
   ===============  PREVISUALIZAR AVATAR  ======================
   ============================================================ */
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
let avatarFile = null;

if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    avatarFile = avatarInput.files[0];
    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = e => {
        avatarPreview.style.backgroundImage = `url('${e.target.result}')`;
      };
      reader.readAsDataURL(avatarFile);
    }
  });
}

/* ============================================================
   ======================  SNACKBAR  ===========================
   ============================================================ */
function mostrarSnackbar(msg) {
  const bar = document.getElementById("snackbar");
  bar.innerText = msg;
  bar.className = "show";
  setTimeout(() => bar.className = bar.className.replace("show", ""), 2200);
}

/* ============================================================
   =====================  REGISTRO  ============================
   ============================================================ */
const form = document.getElementById("registroForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("nombreInput").value.trim();
  const email = document.getElementById("correoInput").value.trim();
  const phone = document.getElementById("telefonoInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const confirm = document.getElementById("confirmPasswordInput").value.trim();
  let photoURL = "imagenes/avatar-default.svg";

  /* --- VALIDACIONES --- */
  if (password.includes(" ")) {
    return mostrarSnackbar("La contraseña no puede contener espacios.");
  }

  if (password !== confirm) {
    return mostrarSnackbar("Las contraseñas no coinciden.");
  }

  if (phone.length < 8) {
    return mostrarSnackbar("Número de teléfono inválido.");
  }

  mostrarSnackbar("Creando tu cuenta… ⏳");

  /* ============================================================
     ============== SUBIR FOTO A SUPABASE STORAGE ===============
     ============================================================ */
  if (avatarFile) {
    const filePath = `avatars/${Date.now()}_${avatarFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("usuarios")
      .upload(filePath, avatarFile);

    if (uploadError) {
      console.error(uploadError);
      return mostrarSnackbar("Error al subir foto.");
    }

    const { data: publicURL } = supabase.storage
      .from("usuarios")
      .getPublicUrl(filePath);

    photoURL = publicURL.publicUrl;
  }

  /* ============================================================
     ============== CREAR USUARIO EN SUPABASE ===================
     ============================================================ */
  try {
    const data = await registerUser(
      email,
      password,
      phone,
      fullName,
      "Honduras",
      photoURL
    );

    mostrarSnackbar("Cuenta creada con éxito ✔️");

    // Reset visual
    form.reset();
    avatarPreview.style.backgroundImage = "url('imagenes/avatar-default.svg')";

    // Redirigir después de 1.5s
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (error) {
    console.error(error);
    mostrarSnackbar(error.message || "Error al registrar usuario.");
  }
});
