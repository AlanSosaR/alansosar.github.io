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

  let msgEl = field?.querySelector(".field-msg");
  if (field && !msgEl) {
    msgEl = document.createElement("div");
    msgEl.className = "field-msg";
    field.appendChild(msgEl);
  }

  const snackbarEl = document.getElementById("snackbar");
  const snackMsgEl = snackbarEl?.querySelector(".snackbar__msg");
  const snackActionsEl = snackbarEl?.querySelector(".snackbar__actions");

  let snackResolver = null;
  let snackClickHandler = null;

  function setSnackType(type) {
    if (!snackbarEl) return;
    snackbarEl.classList.remove("is-error", "is-warn", "is-success");
    if (type === "error") snackbarEl.classList.add("is-error");
    if (type === "warn") snackbarEl.classList.add("is-warn");
    if (type === "success") snackbarEl.classList.add("is-success");
  }

  function openSnackbar(message, type = "info") {
    if (!snackbarEl) return;
    snackbarEl.classList.remove("hidden", "show");
    setSnackType(type);

    if (snackMsgEl) snackMsgEl.textContent = message;
    else snackbarEl.textContent = message;

    void snackbarEl.offsetWidth;
    snackbarEl.classList.add("show");
  }

  function closeSnackbar() {
    if (!snackbarEl) return;
    snackbarEl.classList.remove("show");
    snackbarEl.classList.add("hidden");

    if (snackActionsEl) snackActionsEl.style.display = "";
    if (snackClickHandler && snackActionsEl) {
      snackActionsEl.removeEventListener("click", snackClickHandler);
      snackClickHandler = null;
    }

    if (snackResolver) {
      const r = snackResolver;
      snackResolver = null;
      r("cancel");
    }
  }

  // SOLO para errores del sistema (esto sí autocierra)
  function showSnackbar(message, type = "info", ms = 2600) {
    openSnackbar(message, type);

    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      closeSnackbar();
    }, ms);
  }

  // Snackbar con acciones (NO autocierra)
  function actionSnackbar({
    message,
    type = "info",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    showCancel = true,
  }) {
    return new Promise((resolve) => {
      if (!snackbarEl || !snackActionsEl || !snackMsgEl) {
        // fallback: no hay snackbar action
        showSnackbar(message, type, 2600);
        resolve("confirm");
        return;
      }

      clearTimeout(window.__snackTimer);

      snackResolver = resolve;

      snackActionsEl.style.display = "inline-flex";

      const btnCancel = snackActionsEl.querySelector('[data-action="cancel"]');
      const btnConfirm = snackActionsEl.querySelector('[data-action="confirm"]');

      if (btnConfirm) btnConfirm.textContent = confirmText;

      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.style.display = showCancel ? "" : "none";
      }

      openSnackbar(message, type);

      if (snackClickHandler) snackActionsEl.removeEventListener("click", snackClickHandler);

      snackClickHandler = (e) => {
        const b = e.target.closest("button");
        if (!b) return;

        const action = b.dataset.action;
        if (!action) return;

        const r = snackResolver;
        snackResolver = null;

        snackActionsEl.removeEventListener("click", snackClickHandler);
        snackClickHandler = null;

        r(action === "confirm" ? "confirm" : "cancel");
      };

      snackActionsEl.addEventListener("click", snackClickHandler);
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

        // Confirmación (no autocierra)
        const decision = await actionSnackbar({
          message: "¿Enviar enlace de recuperación a este correo?",
          type: "warn",
          confirmText: "Confirmar",
          cancelText: "Cancelar",
          showCancel: true,
        });

        if (decision !== "confirm") {
          setLoading(false);
          closeSnackbar();
          return;
        }

        const redirectTo = `${window.location.origin}/new-password.html`;
        const { error } = await sb.auth.resetPasswordForEmail(raw, { redirectTo });

        if (error) {
          console.error(error);
          setLoading(false);
          closeSnackbar();
          showSnackbar("No se pudo enviar el correo. Intenta de nuevo.", "error", 3200);
          return;
        }

        localStorage.setItem("cortero_recovery_email", raw);
        setLoading(false);

        // Mensaje “enviado” (NO autocierra). Solo cierra si el usuario toca “Cerrar”
        await actionSnackbar({
          message: "Correo enviado. Revisa tu bandeja para cambiar la contraseña.",
          type: "success",
          confirmText: "Cerrar",
          cancelText: "",
          showCancel: false,
        });

        closeSnackbar(); // cierra solo cuando el usuario tocó “Cerrar”
        return; // te quedas en la misma página
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

      const decision = await actionSnackbar({
        message: "¿Enviar código por SMS para recuperar la contraseña?",
        type: "warn",
        confirmText: "Confirmar",
        cancelText: "Cancelar",
        showCancel: true,
      });

      if (decision !== "confirm") {
        setLoading(false);
        closeSnackbar();
        return;
      }

      const { error } = await sb.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });

      if (error) {
        console.error(error);
        setLoading(false);
        closeSnackbar();
        showSnackbar("No se pudo enviar el SMS. Revisa el número.", "error", 3600);
        return;
      }

      localStorage.setItem("cortero_recovery_phone", phone);
      setLoading(false);

      // Mensaje “enviado” (NO autocierra). Al cerrar, redirige.
      await actionSnackbar({
        message: "Código enviado por SMS. Presiona “Cerrar” para continuar.",
        type: "success",
        confirmText: "Cerrar",
        cancelText: "",
        showCancel: false,
      });

      closeSnackbar();
      window.location.href = "verificar-sms.html";
    } catch (err) {
      console.error("❌ Forgot error:", err);
      setLoading(false);
      closeSnackbar();
      showSnackbar("Error inesperado. Intenta de nuevo.", "error", 3200);
    }
  });
})();
