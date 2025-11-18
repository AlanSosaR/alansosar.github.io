// =============================================
// REGISTRO – Café Cortero ☕ Supabase Premium
// =============================================

// Inicializar Supabase
const supabase = window.supabaseClient;

// Inputs
const form = document.getElementById("registroForm");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

// Snackbar
function mostrarSnackbar(msg) {
  const bar = document.getElementById("snackbar");
  bar.innerText = msg;
  bar.className = "show";
  setTimeout(() => (bar.className = bar.className.replace("show", "")), 2200);
}

// ============================================================
// PREVISUALIZAR AVATAR
// ============================================================
if (avatarInput) {
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        avatarPreview.style.backgroundImage = `url('${e.target.result}')`;
      };
      reader.readAsDataURL(file);
    }
  });
}

// ============================================================
// SUBIR IMAGEN A SUPABASE STORAGE
// ============================================================
async function subirAvatar(file, userId) {
  if (!file) return "imagenes/avatar-default.svg";

  const fileExt = file.name.split(".").pop();
  const fileName = `avatar-${userId}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    console.error("Error subiendo avatar:", uploadError);
    return "imagenes/avatar-default.svg";
  }

  const { data: publicURL } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return publicURL.publicUrl;
}

// ============================================================
// REGISTRO PRINCIPAL
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("nombreInput").value.trim();
  const emailInput = document.getElementById("correoInput").value.trim();
  const phone = document.getElementById("telefonoInput").value.trim();
  const pass = document.getElementById("passwordInput").value.trim();
  const confirm = document.getElementById("confirmPasswordInput").value.trim();
  const avatarFile = avatarInput.files[0];

  // ---------------------
  // VALIDACIONES
  // ---------------------
  if (!fullName) return mostrarSnackbar("Ingresa tu nombre completo.");
  if (phone.length < 8) return mostrarSnackbar("Teléfono inválido.");
  if (pass.includes(" ")) return mostrarSnackbar("La contraseña no debe tener espacios.");
  if (pass !== confirm) return mostrarSnackbar("Las contraseñas no coinciden.");

  // Permitir registro con teléfono → correo virtual
  let email = emailInput;
  if (!email.includes("@")) {
    email = `${phone}@cortero.hn`;
  }

  // ============================================================
  // 1️⃣ CREAR USUARIO EN SUPABASE AUTH
  // ============================================================
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        country: "HN",
        photo_url: null
      }
    }
  });

  if (signupError) {
    console.error(signupError);
    mostrarSnackbar("Error al crear la cuenta.");
    return;
  }

  const userId = signupData.user.id;

  // ============================================================
  // 2️⃣ SUBIR FOTO (si existe)
  // ============================================================
  let avatarURL = await subirAvatar(avatarFile, userId);

  // ============================================================
  // 3️⃣ ACTUALIZAR PERFIL EN AUTH
  // ============================================================
  await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      phone: phone,
      photo_url: avatarURL
    }
  });

  // ============================================================
  // 4️⃣ INSERTAR EN TABLA "usuarios"
  // ============================================================
  const { error: dbError } = await supabase
    .from("usuarios")
    .insert({
      id: userId,
      full_name: fullName,
      email: email,
      phone: phone,
      photo_url: avatarURL,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (dbError) {
    console.error(dbError);
    mostrarSnackbar("Error guardando datos en la base.");
    return;
  }

  // ============================================================
  // ✔ REGISTRO TERMINADO
  // ============================================================
  mostrarSnackbar("Cuenta creada con éxito ✔️");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
});
