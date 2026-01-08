// ============================================================
// Forgot Password — Café Cortero
// Recuperación por CORREO (email reset) y TELÉFONO (OTP SMS)
// Requiere: <div id="snackbar" class="snackbar hidden"></div>
// ============================================================

const sb = window.supabaseClient;

const form = document.getElementById("forgotForm");
const input = document.getElementById("recoverInput");

/* ---------------- SNACKBAR (GENÉRICO) ---------------- */
function showSnackbar(message, type = "info", ms = 2600) {
  const el = document.getElementById("snackbar");
  if (!el) return;

  el.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");
  if (type === "error") el.classList.add("is-error");
  if (type === "warn") el.classList.add("is-warn");
  if (type === "success") el.classList.add("is-success");

  el.textContent = message;

  // reflow
  void el.offsetWidth;

  el.classList.add("show");
  clearTimeout(window.__snackTimer);
  window.__snackTimer = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hidden");
  }, ms);
}

/* ---------------- Helpers ---------------- */
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
}

// E.164 “suave”: admite + y 7-15 dígitos
function isPhone(v) {
  const cleaned = v.replace(/[\s-]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned);
}

function normalizePhone(v) {
  // Mantén el + si viene. Quita espacios/guiones.
  return v.replace(/[\s-]/g, "");
}

async function userExistsBy(column, value) {
  const { data, error } = await sb
    .from("users")
    .select("id,email,phone")
    .eq(column, value)
    .maybeSingle();

  if (error) return { ok: false, error };
  return { ok: !!data, user: data || null };
}

/* ---------------- SUBMIT ---------------- */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const valueRaw = (input?.value || "").trim();
  if (!valueRaw) {
    showSnackbar("Ingresa tu correo o teléfono.", "warn");
    return;
  }

  if (!sb) {
    showSnackbar("Supabase no está listo. Intenta de nuevo.", "error");
    return;
  }

  // Determinar tipo
  const emailMode = isEmail(valueRaw);
  const phoneMode = !emailMode && isPhone(valueRaw);

  if (!emailMode && !phoneMode) {
    showSnackbar("Formato inválido. Usa correo o teléfono.", "warn");
    return;
  }

  /* ===================== CORREO ===================== */
  if (emailMode) {
    // 1) Validar que exista en tu tabla pública
    const exists = await userExistsBy("email", valueRaw);
    if (!exists.ok) {
      showSnackbar("No se pudo validar la cuenta. Intenta de nuevo.", "error");
      return;
    }
    if (!exists.user) {
      showSnackbar("No encontramos una cuenta con ese correo.", "warn");
      return;
    }

    // 2) Supabase envía email de reset
    const redirectTo = `${window.location.origin}/new-password.html`;

    const { error } = await sb.auth.resetPasswordForEmail(valueRaw, { redirectTo });

    if (error) {
      showSnackbar("No se pudo enviar el correo. Intenta de nuevo.", "error");
      return;
    }

    showSnackbar("Enviamos el enlace a tu correo.", "success", 2400);
    setTimeout(() => {
      window.location.href = "correo-enviado.html";
    }, 900);

    return;
  }

  /* ===================== TELÉFONO ===================== */
  const phone = normalizePhone(valueRaw);

  // 1) Validar que exista en tu tabla pública
  const exists = await userExistsBy("phone", phone);
  if (!exists.ok) {
    showSnackbar("No se pudo validar la cuenta. Intenta de nuevo.", "error");
    return;
  }
  if (!exists.user) {
    showSnackbar("No encontramos una cuenta con ese teléfono.", "warn");
    return;
  }

  // 2) Pedir OTP por SMS (Supabase)
  // Nota: tu proyecto debe tener Phone Auth + proveedor SMS configurado.
  const { error } = await sb.auth.signInWithOtp({
    phone,
    options: {
      // opcional: si quieres que cree usuario (NO recomendado aquí)
      shouldCreateUser: false
    }
  });

  if (error) {
    showSnackbar("No se pudo enviar el SMS. Revisa el número.", "error");
    return;
  }

  // Guardar teléfono para la pantalla de verificación
  localStorage.setItem("cortero_recovery_phone", phone);

  showSnackbar("Te enviamos un código por SMS.", "success", 2200);
  setTimeout(() => {
    window.location.href = "verificar-sms.html";
  }, 700);
});
