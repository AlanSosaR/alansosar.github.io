(() => {
  const sb = window.supabaseClient || window.supabase || null;

  const form = document.getElementById("newPassForm");
  if (!form || !sb) return;

  const newPassInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  const btn     = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader  = btn?.querySelector(".loader");

  // =====================
  // SNACKBAR (NO AUTOCLOSE)
  // =====================
  const snack        = document.getElementById("snackbar");
  const snackMsg     = snack?.querySelector(".snackbar__msg");
  const snackActions = snack?.querySelector(".snackbar__actions");

  let snackResolver = null;
  let snackClickHandler = null;

  function openSnack(message, type = "info", {
    confirmText = "Confirmar",
    cancelText = "",
    showCancel = false,
  } = {}) {
    if (!snack) return;

    snack.classList.remove("hidden", "is-error", "is-warn", "is-success");
    snack.classList.add("show", `is-${type}`);

    snackMsg.textContent = message;
    snackActions.style.display = "inline-flex";

    const btnConfirm = snackActions.querySelector('[data-action="confirm"]');
    const btnCancel  = snackActions.querySelector('[data-action="cancel"]');

    if (btnConfirm) btnConfirm.textContent = confirmText;

    if (btnCancel) {
      btnCancel.textContent = cancelText;
      btnCancel.style.display = showCancel ? "" : "none";
    }

    return new Promise((resolve) => {
      snackResolver = resolve;

      if (snackClickHandler) {
        snackActions.removeEventListener("click", snackClickHandler);
      }

      snackClickHandler = (e) => {
        const b = e.target.closest("button");
        if (!b) return;

        const action = b.dataset.action;

        snack.classList.remove("show");
        snack.classList.add("hidden");

        snackActions.removeEventListener("click", snackClickHandler);
        snackClickHandler = null;

        const r = snackResolver;
        snackResolver = null;

        if (r) r(action === "confirm" ? "confirm" : "cancel");
      };

      snackActions.addEventListener("click", snackClickHandler);
    });
  }

  // =====================
  // ERRORES POR CAMPO
  // =====================
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

  // =====================
  // VALIDAR SESIÓN RECOVERY
  // =====================
  async function asegurarSesionRecovery() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      const decision = await openSnack(
        "Tu enlace de recuperación expiró. Solicita uno nuevo.",
        "error",
        { confirmText: "Recuperar", cancelText: "Cerrar", showCancel: true }
      );

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

  // =====================
  // VALIDACIÓN PASSWORD
  // =====================
  function validarPassword(pw) {
    if (pw.length < 8) return "Debe tener al menos 8 caracteres.";
    if (pw.includes(" ")) return "No debe contener espacios.";
    if (!/[A-Za-z]/.test(pw)) return "Debe incluir al menos una letra.";
    if (!/[0-9]/.test(pw)) return "Debe incluir al menos un número.";
    return null;
  }

  // =====================
  // SUBMIT
  // =====================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearError(newPassInput);
    clearError(confirmInput);

    const pw1 = newPassInput.value.trim();
    const pw2 = confirmInput.value.trim();

    if (!pw1) return setError(newPassInput, "Ingresa tu nueva contraseña.");
    if (!pw2) return setError(confirmInput, "Confirma tu contraseña.");

    const pwError = validarPassword(pw1);
    if (pwError) return setError(newPassInput, pwError);

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

    // ✅ SNACKBAR NO SE CIERRA SOLO
    const decision = await openSnack(
      "Contraseña actualizada correctamente.",
      "success",
      { confirmText: "Ir a login" }
    );

    if (decision === "confirm") {
      window.location.href = "login.html";
    }
  });

  // =====================
  // TOGGLE PASSWORD
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
