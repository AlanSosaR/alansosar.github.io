// ========================================================
// LOGIN – Café Cortero ☕ (VERSIÓN FINAL ESTABLE)
// VALIDACIÓN + SESIÓN + PERFIL EN LOCALSTORAGE
// + GOOGLE OAUTH (SPA) + AUTO-REDIRECT + AVATAR GOOGLE + STORAGE UPLOAD
// ========================================================

/* ========================= DOM ========================= */

const loginForm = document.getElementById("loginForm");
const userInput = document.getElementById("userInput");
const passInput = document.getElementById("passwordInput");
const loginBtn  = document.querySelector(".m3-btn");
const btnText   = loginBtn?.querySelector(".btn-text");
const btnLoader = loginBtn?.querySelector(".loader");

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

/* ========================= HELPERS (AVATAR GOOGLE + STORAGE) ========================= */

const DEFAULT_AVATAR = "/imagenes/avatar-default.svg";
const AVATAR_BUCKET = "avatars"; // tu bucket en Supabase

function getGoogleAvatarUrl(user) {
  const md = user?.user_metadata || {};
  return (
    md.avatar_url ||
    md.picture ||
    md.photo_url ||
    md.profile_picture ||
    null
  );
}

function persistAvatarToLocal(avatarUrl) {
  if (!avatarUrl) return;
  try {
    localStorage.setItem("cortero_avatar", avatarUrl);
  } catch (_) {}
}

function mergeAvatarIntoCorteroUser(avatarUrl) {
  if (!avatarUrl) return;
  try {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return;

    const perfil = JSON.parse(raw);
    if (!perfil) return;

    // Respeta lo que ya venga de BD, pero si no hay, pon el de Google
    if (!perfil.photo_url && !perfil.avatar_url) {
      perfil.photo_url = avatarUrl;
      perfil.avatar_url = avatarUrl;
      localStorage.setItem("cortero_user", JSON.stringify(perfil));
    }
  } catch (_) {}
}

async function tryPersistAvatarToDB(sb, user, avatarUrl) {
  // No bloquea nada si falla. Solo intenta si existe user y avatar.
  if (!sb || !user?.id || !avatarUrl) return;
  try {
    await sb
      .from("users")
      .update({ photo_url: avatarUrl })
      .eq("id", user.id);
  } catch (_) {
    // Silencioso: tu app no debe romperse por esto
  }
}

/**
 * Descarga la imagen de Google y la sube a Supabase Storage (bucket "avatars").
 * Retorna el publicUrl si pudo, o null si no.
 * Nota: si fetch() falla por CORS, no rompe el login; solo cae al URL de Google.
 */
async function uploadGoogleAvatarToStorage(sb, user) {
  if (!sb || !user?.id) return null;

  const googleUrl = getGoogleAvatarUrl(user);
  if (!googleUrl) return null;

  let res;
  try {
    res = await fetch(googleUrl, { mode: "cors" });
  } catch (e) {
    console.warn("No se pudo descargar avatar de Google (fetch):", e);
    return null;
  }

  if (!res.ok) {
    console.warn("Descarga avatar no OK:", res.status);
    return null;
  }

  const blob = await res.blob();
  const contentType = blob.type || "image/jpeg";

  const ext = contentType.includes("png") ? "png"
            : contentType.includes("webp") ? "webp"
            : contentType.includes("gif") ? "gif"
            : "jpg";

  const filePath = `avatar_${user.id}.${ext}`;

  const { error: upErr } = await sb.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, blob, {
      contentType,
      upsert: true,
      cacheControl: "3600"
    });

  if (upErr) {
    console.warn("No se pudo subir avatar a Storage:", upErr);
    return null;
  }

  const { data: pub } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  const publicUrl = pub?.publicUrl || null;

  return publicUrl;
}

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

if (userInput) userInput.addEventListener("input", limpiarErroresInput);
if (passInput) passInput.addEventListener("input", limpiarErroresInput);

function marcarError(input, texto) {
  const field = input.closest(".m3-field");
  const box   = field.querySelector(".m3-input");
  const msg   = field.querySelector(".field-msg");

  box.classList.add("error");
  msg.textContent = texto;
  msg.style.opacity = "1";
}

/* ========================= UI ========================= */

function activarLoading() {
  if (!loginBtn) return;
  loginBtn.classList.add("loading");
  if (btnText) btnText.style.opacity = "0";
  if (btnLoader) btnLoader.style.display = "inline-block";
}

function desactivarLoading() {
  if (!loginBtn) return;
  loginBtn.classList.remove("loading");
  if (btnText) btnText.style.opacity = "1";
  if (btnLoader) btnLoader.style.display = "none";
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
    if (!target) return;
    const visible = target.type === "password";
    target.type = visible ? "text" : "password";
    icon.textContent = visible ? "visibility_off" : "visibility";
  });
});

/* =========================================================
   GOOGLE OAUTH + AUTO-REDIRECT (ANTI-LOGIN-FLASH)
   - Si viene ?code=... => exchangeCodeForSession y redirige
   - Si YA existe sesión => redirige directo a index
========================================================= */
(async function googleGateAndCallback() {
  const sb = window.supabaseClient;
  if (!sb) return;

  // Evita dobles ejecuciones raras
  if (window.__google_gate_ran__) return;
  window.__google_gate_ran__ = true;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  try {
    // 1) Si viene callback con code: crear sesión
    if (code) {
      const { data, error } = await sb.auth.exchangeCodeForSession(url.href);
      console.log("OAuth exchange:", data, error);

      if (error || !data?.session?.user) {
        mostrarSnackbar("Google OAuth falló. Revisa la configuración.", "error");
        return; // deja el login visible
      }

      const user = data.session.user;

      // Crear perfil (si tienes RPC). No bloquea el login si falla.
      try {
        await sb.rpc("ensure_user_profile");
      } catch (e) {
        console.warn("RPC ensure_user_profile falló (opcional):", e);
      }

      // 1) Intentar guardar imagen en Storage (bucket avatars)
      const storageUrl = await uploadGoogleAvatarToStorage(sb, user);

      // 2) Elegir avatar final (preferimos Storage; si no, Google; si no, default)
      const googleUrl = getGoogleAvatarUrl(user);
      const avatarUrl = storageUrl || googleUrl || DEFAULT_AVATAR;

      // Persistir local + merge con cortero_user
      persistAvatarToLocal(avatarUrl);
      mergeAvatarIntoCorteroUser(avatarUrl);

      // Guardar en BD best-effort
      await tryPersistAvatarToDB(sb, user, avatarUrl);

      localStorage.setItem("cortero_logged", "1");

      // Limpia la URL (quita ?code=...)
      history.replaceState(null, "", url.pathname);

      // Redirigir directo (no mostrar login)
      window.location.replace("index.html");
      return;
    }

    // 2) Si no hay code pero ya hay sesión, manda a index
    const { data: sesData, error: sesErr } = await sb.auth.getSession();
    if (!sesErr && sesData?.session?.user) {
      const user = sesData.session.user;

      // Intentar Storage (por si aún no se subió)
      const storageUrl = await uploadGoogleAvatarToStorage(sb, user);
      const googleUrl = getGoogleAvatarUrl(user);
      const avatarUrl = storageUrl || googleUrl || null;

      if (avatarUrl) {
        persistAvatarToLocal(avatarUrl);
        mergeAvatarIntoCorteroUser(avatarUrl);
        await tryPersistAvatarToDB(sb, user, avatarUrl);
      }

      localStorage.setItem("cortero_logged", "1");
      window.location.replace("index.html");
      return;
    }

    // 3) No hay sesión: se queda en login normal
  } catch (e) {
    console.error("❌ Google gate/callback error:", e);
    // No bloquees el login por errores aquí
  }
})();

/* ========================= LOGIN (EMAIL/PASS) ========================= */
if (loginForm) {
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

        // 2) Fallback por email
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
}

/* ---------- BOTÓN GOOGLE (INICIA OAUTH) ---------- */
const googleBtn = document.getElementById("googleLoginBtn");

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error("Supabase no está inicializado");

      // GitHub Pages: debe ser EXACTO
      const redirectTo = `${window.location.origin}/login.html`;

      await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    } catch (err) {
      console.error("❌ Google login:", err);
      mostrarSnackbar("No se pudo iniciar sesión con Google.", "error");
    }
  });
}
