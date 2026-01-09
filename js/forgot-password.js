(() => {
  const sb = window.supabaseClient;

  const form = document.getElementById("forgotForm");
  const input = document.getElementById("recoverInput");
  if (!form || !input || !sb) return;

  const btn = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader = btn?.querySelector(".loader");

  const field = input.closest(".m3-field");
  const box = input.closest(".m3-input");
  const msgEl = field?.querySelector(".field-msg");

  // =====================
  // SNACKBAR (MANUAL)
  // =====================
  const snackbar = document.getElementById("snackbar");
  const snackMsg = snackbar?.querySelector(".snackbar__msg");
  const snackActions = snackbar?.querySelector(".snackbar__actions");

  let snackHandler = null;

  function openSnackbar(message, type = "info", {
    confirmText = "Confirmar",
    showCancel = false,
  } = {}) {
    if (!snackbar) return Promise.resolve("confirm");

    snackbar.classList.remove("hidden", "is-error", "is-success", "is-warn");
    snackbar.classList.add("show", `is-${type}`);

    snackMsg.textContent = message;

    snackActions.style.display = "inline-flex";

    const btnConfirm = snackActions.querySelector('[data-action="confirm"]');
    const btnCancel  = snackActions.querySelector('[data-action="cancel"]');

    if (btnConfirm) btnConfirm.textContent = confirmText;
    if (btnCancel) btnCancel.style.display = showCancel ? "" : "none";

    return new Promise((resolve) => {
      if (snackHandler) {
        snackActions.removeEventListener("click", snackHandler);
      }

      snackHandler = (e) => {
        const b = e.target.closest("button");
        if (!b) return;

        snackbar.classList.remove("show");
        snackbar.classList.add("hidden");

        snackActions.removeEventListener("click", snackHandler);
        snackHandler = null;

        resolve(b.dataset.action === "confirm" ? "confirm" : "cancel");
      };

      snackActions.addEventListener("click", snackHandler);
    });
  }

  // =====================
  // ERRORES DE CAMPO
  // =====================
  function setFieldError(text) {
    box?.classList.add("error");
    field?.classList.add("has-error");
    if (msgEl) msgEl.textContent = text;
  }

  function clearFieldError() {
    box?.classList.remove("error");
    field?.classList.remove("has-error");
    if (msgEl) msgEl.textContent = "";
  }

  input.addEventListener("input", clearFieldError);

  // =====================
  // LOADING BUTTON
  // =====================
  function setLoading(on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);

    // ⬅ loader a la izquierda, texto visible
    if (loader) loader.style.display = on ? "inline-block" : "none";
  }

  // =====================
  // VALIDACIONES
  // =====================
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
  }

  function isPhone(v) {
    return /^\+?\d{7,15}$/.test(v.replace(/[\s-]/g, ""));
  }

  // =====================
  // SUBMIT
  // =====================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldError();

    const value = input.value.trim();

    if (!value) {
      setFieldError("Ingresa tu correo electrónico.");
      return;
    }

    if (isPhone(value) && !isEmail(value)) {
      setFieldError("La recuperación por teléfono no está disponible por el momento.");
      return;
    }

    if (!isEmail(value)) {
      setFieldError("Ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/new-password.html`;

      const { error } = await sb.auth.resetPasswordForEmail(value, {
        redirectTo,
      });

      setLoading(false);

      if (error) {
        console.error(error);
        await openSnackbar(
          "No se pudo enviar el correo. Intenta más tarde.",
          "error",
          { confirmText: "Cerrar" }
        );
        return;
      }

      // ✅ Confirmación del usuario
      const decision = await openSnackbar(
        "El enlace de recuperación se enviará a tu correo electrónico.",
        "success",
        { confirmText: "Confirmar" }
      );

      if (decision === "confirm") {
        await openSnackbar(
          "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. " +
          "Si no lo ves en la bandeja principal, revisa tu carpeta de spam.",
          "success",
          { confirmText: "Cerrar" }
        );

        input.value = "";
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      await openSnackbar(
        "Error inesperado. Intenta de nuevo.",
        "error",
        { confirmText: "Cerrar" }
      );
    }
  });
})();
