/* Forgot Password — Café Cortero (CORREGIDO)
   - Email: se queda en la página (no redirige)
   - Teléfono: redirige a verificar-sms.html
   - Errores debajo del input (field-msg)
   - Snackbar Material 3 Expressive (hidden/show + variantes)
*/

(() => {
  const sb = window.supabaseClient;

  const form = document.getElementById("forgotForm");
  const input = document.getElementById("recoverInput");
  if (!form || !input) return;

  const btn = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader = btn?.querySelector(".loader");

  const field = input.closest(".m3-field");
  const box = input.closest(".m3-input");

  // Si no existe <div class="field-msg"></div>, lo creamos.
  let msgEl = field?.querySelector(".field-msg");
  if (field && !msgEl) {
    msgEl = document.createElement("div");
    msgEl.className = "field-msg";
    field.appendChild(msgEl);
  }

  const snackbarEl = document.getElementById("snackbar");
  const snackMsgEl = snackbarEl?.querySelector(".snackbar__msg");
  const snackActionsEl = snackbarEl?.querySelector(".snackbar__actions");

  function showSnackbar(message, type = "info", ms = 2600) {
    if (!snackbarEl) return;

    snackbarEl.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");
    if (type === "error") snackbarEl.classList.add("is-error");
    if (type === "warn") snackbarEl.classList.add("is-warn");
    if (type === "success") snackbarEl.classList.add("is-success");

    if (snackMsgEl) snackMsgEl.textContent = message;
    else snackbarEl.textContent = message;

    void snackbarEl.offsetWidth;
    snackbarEl.classList.add("show");

    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      snackbarEl.classList.remove("show");
      snackbarEl.classList.add("hidden");
    }, ms);
  }

  // Snackbar con acciones (Confirmar/Cancelar) si tienes ese HTML.
  function confirmSnackbar({ message, type = "info" }) {
    return new Promise((resolve) => {
      // Si no hay botones/estructura action, fallback directo a "confirmado".
      if (!snackbarEl || !snackActionsEl || !snackMsgEl) {
        showSnackbar(message, type, 2400);
        resolve(true);
        return;
      }

      snackbarEl.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");
      if (type === "error") snackbarEl.classList.add("is-error");
      if (type === "warn") snackbarEl.classList.add("is-warn");
      if (type === "success") snackbarEl.classList.add("is-success");

      snackMsgEl.textContent = message;

      // Mostrar y NO autocerrar hasta que el usuario elija
      clearTimeout(window.__snackTimer);
      void snackbarEl.offsetWidth;
      snackbarEl.classList.add("show");

      const onClick = (e) => {
        const action = e.target?.dataset?.action;
        if (!action) return;

        snackActionsEl.removeEventListener("click", onClick);
        snackbarEl.classList.remove("show");
        snackbarEl.classList.add("hidden");

        resolve(action === "confirm");
      };

      snackActionsEl.addEventListener("click", onClick);
    });
  }

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldError();

    const raw = (input.value || "").trim();

    if (!sb) {
      showSnackbar("Supabase no está listo. Revisa tus scripts.", "error", 3200);
      return;
    }

    if (!raw) {
      setFieldError("Ingresa tu correo o teléfono.");
      return;
    }

    const emailMode = isEmail(raw);
    const phoneMode = !emailMode && isPhone(raw);

    if (!emailMode && !phoneMode) {
      setFieldError("Formato inválido. Usa un correo o teléfono válido.");
      return;
    }

    setLoading(true);

    try {
      // ===================== EMAIL =====================
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

        // Confirmación opcional (si tienes action snackbar). Si no, sigue normal.
        const ok = await confirmSnackbar({
          message: "¿Enviar enlace de recuperación a este correo?",
          type: "warn"
        });

        if (!ok) {
          setLoading(false);
          showSnackbar("Acción cancelada.", "warn", 1800);
          return;
        }

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

        // Importante: NO redirigir. Te quedas en la pantalla.
        showSnackbar("Listo. Revisa tu correo para cambiar la contraseña.", "success", 3200);

        return;
      }

      // ===================== PHONE =====================
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

      const ok = await confirmSnackbar({
        message: "¿Enviar código por SMS para recuperar la contraseña?",
        type: "warn"
      });

      if (!ok) {
        setLoading(false);
        showSnackbar("Acción cancelada.", "warn", 1800);
        return;
      }

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
      showSnackbar("Te enviamos un código por SMS.", "success", 2200);

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
