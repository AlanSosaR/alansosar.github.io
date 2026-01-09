(() => {
  const sb = window.supabaseClient || window.supabase || null;

  const form = document.getElementById("newPassForm");
  if (!form || !sb) return;

  const newPassInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  const btn     = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader  = btn?.querySelector(".loader");

  // Snackbar
  const snack        = document.getElementById("snackbar");
  const snackMsg     = snack?.querySelector(".snackbar__msg");
  const snackActions = snack?.querySelector(".snackbar__actions");

  let snackResolver = null;
  let snackClickHandler = null;

  function setSnackType(type) {
    snack?.classList.remove("is-error", "is-warn", "is-success");
    if (type) snack?.classList.add(`is-${type}`);
  }

  function openSnack(message, type = "info") {
    if (!snack) return;
    snack.classList.remove("hidden");
    setSnackType(type);
    snackMsg.textContent = message;
    void snack.offsetWidth;
    snack.classList.add("show");
  }

  function closeSnack() {
    snack?.classList.remove("show");
    snack?.classList.add("hidden");

    if (snackClickHandler && snackActions) {
      snackActions.removeEventListener("click", snackClickHandler);
      snackClickHandler = null;
    }

    if (snackResolver) {
      const r = snackResolver;
      snackResolver = null;
      r("cancel");
    }
  }

  function actionSnack({
    message,
    type = "info",
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    showCancel = true,
  }) {
    return new Promise((resolve) => {
      if (!snack || !snackActions) {
        resolve("confirm");
        return;
      }

      snackResolver = resolve;
      snackActions.style.display = "inline-flex";

      const btnCancel  = snackActions.querySelector('[data-action="cancel"]');
      const btnConfirm = snackActions.querySelector('[data-action="confirm"]');

      if (btnConfirm) btnConfirm.textContent = confirmText;
      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.style.display = showCancel ? "" : "none";
      }

      openSnack(message, type);

      if (snackClickHandler) {
        snackActions.removeEventListener("click", snackClickHandler);
      }

      snackClickHandler = (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const action = b.dataset.action;
        closeSnack();
        resolve(action === "confirm" ? "confirm" : "cancel");
      };

      snackActions.addEventListener("click", snackClickHandler);
    });
  }

  // Helpers de error por campo
  function fieldParts(inputEl) {
    const field = inputEl.closest(".m3-field");
    return {
      box: field?.querySelector(".m3-input"),
      msg: field?.querySelector(".field-msg"),
    };
  }

  function clearError(inputEl) {
    const { box, msg } = fieldParts(inputEl);
    box?.classList.remove("error");
    if (msg) msg.textContent = "";
  }

  function setError(inputEl, text) {
    const { box, msg } = fieldParts(inputEl);
    box?.classList.add("error");
    if (msg) msg.textContent = text;
  }

  newPassInput.addEventListener("input", () => clearError(newPassInput));
  confirmInput.addEventListener("input", () => clearError(confirmInput));

  function setLoading(on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);
    if (btnText) btnText.style.opacity = on ? "0" : "1";
    if (loader) loader.style.display = on ? "inline-block" : "none";
  }

  // Validar sesión recovery
  async function asegurarSesionRecovery() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      const decision = await actionSnack({
        message: "Tu enlace de recuperación expiró. Solicita uno nuevo.",
        type: "error",
        confirmText: "Recuperar",
        cancelText: "Cerrar",
      });

      if (decision === "confirm") {
        window.location.href = "forgot-password.html";
      }
      return false;
    }
    return true;
  }

  (async () => {
    await asegurarSesionRecovery();
  })();

  function validarPassword(pw) {
    return pw.length >= 6 && !pw.includes(" ");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearError(newPassInput);
    clearError(confirmInput);

    const pw1 = newPassInput.value.trim();
    const pw2 = confirmInput.value.trim();

    if (!pw1) return setError(newPassInput, "Ingresa tu nueva contraseña.");
    if (!pw2) return setError(confirmInput, "Confirma tu contraseña.");
    if (!validarPassword(pw1))
      return setError(newPassInput, "Mínimo 6 caracteres, sin espacios.");
    if (pw1 !== pw2)
      return setError(confirmInput, "Las contraseñas no coinciden.");

    const ok = await asegurarSesionRecovery();
    if (!ok) return;

    setLoading(true);

    const { error } = await sb.auth.updateUser({ password: pw1 });

    setLoading(false);

    if (error) {
      setError(confirmInput, "No se pudo cambiar la contraseña.");
      return;
    }

    const decision = await actionSnack({
      message: "Contraseña actualizada correctamente.",
      type: "success",
      confirmText: "Ir a login",
      cancelText: "Quedarme aquí",
    });

    if (decision === "confirm") {
      window.location.href = "login.html";
    }
  });

  // =====================
  // Toggle password (FIX)
  // =====================
  document.querySelectorAll(".toggle-pass").forEach((icon) => {
    const input = document.getElementById(icon.dataset.target);
    if (!input) return;

    icon.style.visibility = "hidden";
    icon.style.cursor = "pointer";

    const sync = () => {
      if (input.value.length > 0) {
        icon.style.visibility = "visible";
      } else {
        icon.style.visibility = "hidden";
        input.type = "password";
        icon.textContent = "visibility";
      }
    };

    input.addEventListener("input", sync);

    icon.addEventListener("click", () => {
      if (!input.value) return;
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      icon.textContent = hidden ? "visibility_off" : "visibility";
    });

    sync();
  });
})();
