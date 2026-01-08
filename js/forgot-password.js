/* ============================================================
   Forgot Password — Café Cortero ☕ (FINAL)
   ✔ Errores debajo del input (field-msg)
   ✔ Snackbar solo para acciones (enviar correo / enviar SMS / fallos server)
   ✔ Valida existencia en BD (tabla users)
   ✔ Email: resetPasswordForEmail
   ✔ Teléfono: signInWithOtp
============================================================ */

(() => {
  const sb = window.supabaseClient;

  const form  = document.getElementById("forgotForm");
  const input = document.getElementById("recoverInput");
  const btn   = form?.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader  = btn?.querySelector(".loader");

  if (!form || !input) return;

  const field = input.closest(".m3-field");
  const box   = input.closest(".m3-input");
  const msgEl = field?.querySelector(".field-msg");

  /* ---------------- SNACKBAR (M3 EXPRESSIVE) ---------------- */
  function showSnackbar(message, type = "info", ms = 2600) {
    const el = document.getElementById("snackbar");
    if (!el) return;

    el.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");
    if (type === "error") el.classList.add("is-error");
    if (type === "warn") el.classList.add("is-warn");
    if (type === "success") el.classList.add("is-success");

    el.textContent = message;
    void el.offsetWidth;
    el.classList.add("show");

    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      el.classList.remove("show");
      el.classList.add("hidden");
    }, ms);
  }

  /* ---------------- Errores debajo del input ---------------- */
  function clearFieldError() {
    box?.classList.remove("error");
    field?.classList.remove("has-error");
    if (msgEl) msgEl.textContent = "";
  }

  function setFieldError(text) {
    box?.classList.add("error");
    field?.classList.add("has-error");
    if (msgEl) msgEl.textContent = text || "";
  }

  input.addEventListener("input", clearFieldError);

  function setLoading(on) {
    if (!btn) return;
    btn.classList.toggle("loading", !!on);
    if (btnText) btnText.style.opacity = on ? "0" : "1";
    if (loader) loader.style.display = on ? "inline-block" : "none";
    btn.disabled = !!on;
  }

  /* ---------------- Validaciones ---------------- */
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
  }

  function isPhone(v) {
    const cleaned = v.replace(/[\s-]/g, "");
    return /^\+?\d{7,15}$/.test(cleaned);
  }

  function normalizePhone(v) {
    return v.replace(/[\s-]/g, "");
  }

  async function getUserBy(column, value) {
    const { data, error } = await sb
      .from("users")
      .select("id,email,phone")
      .eq(column, value)
      .maybeSingle();

    if (error) return { ok: false, error };
    return { ok: true, user: data || null };
  }

  /* ---------------- SUBMIT ---------------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldError();

    const raw = (input.value || "").trim();

    if (!sb) {
      showSnackbar("Supabase no está listo. Revisa tus scripts.", "error", 3200);
      return;
    }

    // Vacío → error debajo
    if (!raw) {
      setFieldError("Ingresa tu correo o teléfono.");
      return;
    }

    const emailMode = isEmail(raw);
    const phoneMode = !emailMode && isPhone(raw);

    // Formato inválido → error debajo
    if (!emailMode && !phoneMode) {
      setFieldError("Formato inválido. Usa un correo o teléfono válido.");
      return;
    }

    setLoading(true);

    try {
      /* ===================== CORREO ===================== */
      if (emailMode) {
        const exists = await getUserBy("email", raw);

        if (!exists.ok) {
          console.error(exists.error);
          setLoading(false);
          showSnackbar("No se pudo validar la cuenta.", "error", 3200);
          return;
        }

        if (!exists.user) {
          setLoading(false);
          setFieldError("No encontramos una cuenta con ese correo.");
          return;
        }

        // Acción → snackbar
        showSnackbar("Se enviará un email para cambiar tu contraseña.", "success", 2400);

        const redirectTo = `${window.location.origin}/new-password.html`;
        const { error } = await sb.auth.resetPasswordForEmail(raw, { redirectTo });

        if (error) {
          console.error(error);
          setLoading(false);
          showSnackbar("No se pudo enviar el correo. Intenta de nuevo.", "error", 3200);
          return;
        }

        localStorage.setItem("cortero_recovery_email", raw);
        setLoading(false);

        setTimeout(() => {
          window.location.href = "correo-enviado.html";
        }, 700);

        return;
      }

      /* ===================== TELÉFONO ===================== */
      const phone = normalizePhone(raw);

      const exists = await getUserBy("phone", phone);

      if (!exists.ok) {
        console.error(exists.error);
        setLoading(false);
        showSnackbar("No se pudo validar la cuenta.", "error", 3200);
        return;
      }

      if (!exists.user) {
        setLoading(false);
        setFieldError("No encontramos una cuenta con ese teléfono.");
        return;
      }

      // Acción → snackbar
      showSnackbar("Se enviará un código por SMS para cambiar tu contraseña.", "success", 2400);

      const { error } = await sb.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false }
      });

      if (error) {
        console.error(error);
        setLoading(false);
        showSnackbar("No se pudo enviar el SMS. Revisa el número.", "error", 3600);
        return;
      }

      localStorage.setItem("cortero_recovery_phone", phone);
      setLoading(false);

      setTimeout(() => {
        window.location.href = "verificar-sms.html";
      }, 700);

    } catch (err) {
      console.error("❌ Forgot error:", err);
      setLoading(false);
      showSnackbar("Error inesperado. Intenta de nuevo.", "error", 3200);
    }
  });
})();
