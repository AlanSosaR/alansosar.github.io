// ========================================================
// LOGIN – Café Cortero ☕ (VERSIÓN FINAL ESTABLE)
// VALIDACIÓN + SESIÓN + PERFIL EN LOCALSTORAGE
// ========================================================

/* ========================= DOM ========================= */

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");
const loginBtn  = document.querySelector(".m3-btn");
const btnText   = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".loader");

/* ========================= DOMINIOS ========================= */

const dominiosValidos = [
  "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com",
  "proton.me","live.com","msn.com",
  "unah.hn","unah.edu","gmail.es","correo.hn",
  "googlemail.com","outlook.es","hotmail.es"
];

const autocorrecciones = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com"
};

/* ========================= VALIDACIONES ========================= */

function tipoDeEntrada(valor) {
  return /^[0-9]+$/.test(valor) ? "telefono" : "correo";
}

function validarCorreo(valor) {
  if (!valor.includes("@")) return false;

  const [user, dominioRaw] = valor.split("@");
  const dominio = dominioRaw?.toLowerCase();
  if (!dominio) return false;

  if (autocorrecciones[dominio]) {
    userInput.value = `${user}@${autocorrecciones[dominio]}`;
    return true;
  }

  return dominio.includes(".") && dominiosValidos.some(d => dominio.endsWith(d));
}

function validarTelefono(valor) {
  const limpio = valor.replace(/[\s-+]/g, "");
  return /^[0-9]{7,15}$/.test(limpio);
}

function validarPassword(valor) {
  return (
    valor.length >= 6 &&
    !valor.includes(" ") &&
    !["123456","000000","password"].includes(valor.toLowerCase())
  );
}

/* ========================= ERRORES UI ========================= */

function limpiarErroresInput(e) {
  const input = e.target;
  const field = input.closest(".m3-field");
  const box   = field.querySelector(".m3-input");
  const msg   = field.querySelector(".field-msg");

  box.classList.remove("error","success");
  msg.textContent = "";
  msg.style.opacity = "0";

  if (input.value.trim()) {
    box.classList.add("success");
    input.classList.add("has-text");
  } else {
    input.classList.remove("has-text");
  }
}

userInput.addEventListener("input", limpiarErroresInput);
passInput.addEventListener("input", limpiarErroresInput);

function marcarError(input, texto) {
  const field = input.closest(".m3-field");
  const box   = field.querySelector(".m3-input");
  const msg   = field.querySelector(".field-msg");

  box.classList.add("error");
  msg.textContent = texto;
  msg.style.opacity = "1";
}

/* ========================= LOGIN ========================= */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userValue = userInput.value.trim();
  const passValue = passInput.value.trim();

  if (!userValue) return marcarError(userInput, "Ingresa tu correo o teléfono");

  const tipo = tipoDeEntrada(userValue);

  if (tipo === "correo" && !validarCorreo(userValue))
    return marcarError(userInput, "Correo no válido");

  if (tipo === "telefono" && !validarTelefono(userValue))
    return marcarError(userInput, "Teléfono inválido");

  if (!passValue)
    return marcarError(passInput, "Ingresa tu contraseña");

  if (!validarPassword(passValue))
    return marcarError(passInput, "Contraseña no válida");

  activarLoading();

  try {
    let emailFinal = userValue;

    /* Teléfono → buscar email */
    if (tipo === "telefono") {
      const { data, error: phoneErr } = await window.supabaseClient
        .from("users")
        .select("email")
        .eq("phone", userValue)
        .maybeSingle();

      if (phoneErr) {
        desactivarLoading();
        mostrarSnackbar("No se pudo validar el teléfono.", "error");
        return;
      }

      if (!data?.email) {
        desactivarLoading();
        return marcarError(userInput, "Teléfono no registrado");
      }

      emailFinal = data.email;
    }

    /* LOGIN REAL */
    const { data: authData, error: loginErr } =
      await window.supabaseClient.auth.signInWithPassword({
        email: emailFinal,
        password: passValue
      });

    if (loginErr) {
      desactivarLoading();
      marcarError(passInput, "Credenciales incorrectas");
      mostrarSnackbar("Credenciales incorrectas", "error");
      return;
    }

    /* ✅ Cargar perfil desde public.users y guardarlo en localStorage */
    const authUser = authData?.user;
    let perfil = null;

    if (authUser?.id) {
      // 1) Por ID (si public.users.id = auth.uid())
      const { data: byId, error: errById } = await window.supabaseClient
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (errById) {
        desactivarLoading();
        mostrarSnackbar("No se pudo cargar tu perfil.", "error");
        return;
      }

      perfil = byId || null;

      // 2) Fallback por email (si tu tabla users.id NO es auth.uid())
      if (!perfil && authUser.email) {
        const { data: byEmail, error: errByEmail } = await window.supabaseClient
          .from("users")
          .select("*")
          .eq("email", authUser.email)
          .maybeSingle();

        if (errByEmail) {
          desactivarLoading();
          mostrarSnackbar("No se pudo cargar tu perfil.", "error");
          return;
        }

        perfil = byEmail || null;
      }
    }

    if (perfil) {
      localStorage.setItem("cortero_user", JSON.stringify(perfil));
      localStorage.setItem("cortero_logged", "1");
    }

    desactivarLoading();
    mostrarSnackbar("Inicio de sesión exitoso", "success");

    setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const from = params.get("from") || params.get("redirect");

      // Si vienes del carrito → regresa al carrito (no a detalles)
      location.href = (from === "carrito")
        ? "carrito.html"
        : "index.html";
    }, 900);

  } catch (err) {
    console.error("❌ Error login:", err);
    desactivarLoading();
    marcarError(userInput, "Error al iniciar sesión");
    mostrarSnackbar("Error al iniciar sesión. Intenta de nuevo.", "error");
  }
});

/* ========================= UI ========================= */

function activarLoading() {
  loginBtn.classList.add("loading");
  btnText.style.opacity = "0";
  btnLoader.style.display = "inline-block";
}

function desactivarLoading() {
  loginBtn.classList.remove("loading");
  btnText.style.opacity = "1";
  btnLoader.style.display = "none";
}

function mostrarSnackbar(msg, type = "info", duration = 2600) {
  const s = document.getElementById("snackbar");
  if (!s) return;

  s.textContent = msg;

  // Reset de clases
  s.className = "snackbar";
  s.id = "snackbar";

  // Activar
  s.classList.add("show", type);

  clearTimeout(s._timer);
  s._timer = setTimeout(() => {
    s.classList.remove("show");
  }, duration);
}
/* ========================= TOGGLE PASSWORD ========================= */

document.querySelectorAll(".toggle-pass").forEach(icon => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);
    const visible = target.type === "password";
    target.type = visible ? "text" : "password";
    icon.textContent = visible ? "visibility_off" : "visibility";
  });
});

/* ========================================================
   LOGIN CON GOOGLE – Café Cortero ☕ (BLOQUE FINAL CORREGIDO)
   ======================================================== */

const DEFAULT_AVATAR = "/imagenes/avatar-default.svg";

/* ---------- BOTÓN GOOGLE ---------- */
const googleBtn = document.getElementById("googleLoginBtn");

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      await window.supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login.html`,
        },
      });
    } catch (err) {
      console.error("❌ Google login:", err);
      mostrarSnackbar("No se pudo iniciar sesión con Google.", "error");
    }
  });
}

/* ---------- AL REGRESAR DE GOOGLE ---------- */
(async function handleGoogleRedirect() {
  const sb = window.supabaseClient;
  if (!sb) return;

  const { data, error } = await sb.auth.getSession();
  if (error || !data?.session?.user?.id) return;

  // Evitar reprocesar sesión
  if (localStorage.getItem("cortero_logged") === "1") {
    window.location.replace("index.html");
    return;
  }

  const authUser = data.session.user;

  /* =========================
     1️⃣ Buscar usuario
     ========================= */
  let { data: perfil, error: findErr } = await sb
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (findErr) {
    console.error("❌ Error buscando perfil:", findErr);
    mostrarSnackbar("Error cargando perfil", "error");
    return;
  }

  /* =========================
     2️⃣ Crear usuario si no existe
     ========================= */
  if (!perfil) {
    const nuevoPerfil = {
      id: authUser.id, // auth.uid()
      email: authUser.email,
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        "",
      phone: authUser.user_metadata?.phone || null,
      photo_url:
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        DEFAULT_AVATAR,
      created_at: new Date().toISOString(),
    };

    const { data: creado, error: createErr } = await sb
      .from("users")
      .insert(nuevoPerfil)
      .select()
      .single();

    if (createErr) {
      console.error("❌ Error creando usuario:", createErr);
      mostrarSnackbar("No se pudo crear el usuario", "error");
      return;
    }

    perfil = creado;
  }

  /* =========================
     3️⃣ Garantizar avatar
     ========================= */
  if (!perfil.photo_url) {
    const avatar =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      DEFAULT_AVATAR;

    await sb
      .from("users")
      .update({ photo_url: avatar })
      .eq("id", authUser.id);

    perfil.photo_url = avatar;
  }

  /* =========================
     4️⃣ Guardar sesión local
     ========================= */
  localStorage.setItem("cortero_user", JSON.stringify(perfil));
  localStorage.setItem("cortero_logged", "1");

  /* =========================
     5️⃣ Redirección inmediata
     ========================= */
  window.location.replace("index.html");
})();
