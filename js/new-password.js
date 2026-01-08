(() => {
  const sb = window.supabaseClient || window.supabase || null;

  const form = document.getElementById("newPassForm");
  if (!form) return;

  const newPassInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  const btn     = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader  = btn?.querySelector(".loader");

  // Snackbar ACTION (no autocierra)
  const snack        = document.getElementById("snackbar");
  const snackMsg     = snack?.querySelector(".snackbar__msg");
  const snackActions = snack?.querySelector(".snackbar__actions");

  let snackResolver = null;
  let snackClickHandler = null;

  function setSnackType(type) {
    if (!snack) return;
    snack.classList.remove("is-error", "is-warn", "is-success");
    if (type === "error") snack.classList.add("is-error");
    if (type === "warn") snack.classList.add("is-warn");
    if (type === "success") snack.classList.add("is-success");
  }

  function openSnack(message, type = "info") {
    if (!snack) return;
    snack.classList.remove("hidden", "show");
    setSnackType(type);

    if (snackMsg) snackMsg.textContent = message;
    else snack.textContent = message;

    void snack.offsetWidth;
    snack.classList.add("show");
  }

  function closeSnack() {
    if (!snack) return;
    snack.classList.remove("show");
    snack.classList.add("hidden");

    if (snackActions) snackActions.style.display = "";

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
        // fallback simple (sin acciones)
        resolve("confirm");
        return;
      }

      snackResolver = resolve;

      // Mostrar acciones
      snackActions.style.display = "inline-flex";

      const btnCancel  = snackActions.querySelector('[data-action="cancel"]');
      const btnConfirm = snackActions.querySelector('[data-action="confirm"]');

      if (btnConfirm) btnConfirm.textContent = confirmText;

      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.style.display = showCancel ? "" : "none";
      }

      openSnack(message, type);

      // listener único
      if (snackClickHandler) snackActions.removeEventListener("click", snackClickHandler);

      snackClickHandler = (e) => {
        const b = e.target.closest("button");
        if (!b) return;

        const action = b.dataset.action;
        if (!action) return;

        const r = snackResolver;
        snackResolver = null;

        snackActions.removeEventListener("click", snackClickHandler);
        snackClickHandler = null;

        r(action === "confirm" ? "confirm" : "cancel");
      };

      snackActions.addEventListener("click", snackClickHandler);
    });
  }

  // Helpers UI (errores por campo)
  function fieldParts(inputEl) {
    const field = inputEl.closest(".m3-field");
    return {
      box: field?.querySelector(".m3-input") || null,
      msg: field?.querySelector(".field-msg") || null,
    };
  }

  function clearError(inputEl) {
    if (!inputEl) return;
    const { box, msg } = fieldParts(inputEl);
    box?.classList.remove("error");
    if (msg) msg.textContent = "";
  }

  function setError(inputEl, text) {
    if (!inputEl) return;
    const { box, msg } = fieldParts(inputEl);
    box?.classList.add("error");
    if (msg) msg.textContent = text || "";
  }

  newPassInput?.addEventListener("input", () => clearError(newPassInput));
  confirmInput?.addEventListener("input", () => clearError(confirmInput));

  // Loading botón
  function setLoading(on) {
    if (!btn) return;
    btn.classList.toggle("loading", !!on);
    btn.disabled = !!on;
    if (btnText) btnText.style.opacity = on ? "0" : "1";
    if (loader) loader.style.display = on ? "inline-block" : "none";
  }

  // Password strength (0–3)
  const bar1 = document.getElementById("bar1");
  const bar2 = document.getElementById("bar2");
  const bar3 = document.getElementById("bar3");

  function strengthLevel(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 10 && /[0-9]/.test(pw)) score++;
    return Math.max(0, Math.min(score, 3));
  }

  function paintStrength(level) {
    const colors = {
      0: "#e1e1e1",
      1: "#f6c343",
      2: "#33c26b",
      3: "#1e8f57",
    };

    [bar1, bar2, bar3].forEach((el, i) => {
      if (!el) return;
      el.style.background = i < level ? colors[level] : colors[0];
      el.style.transition = ".25s";
      el.style.borderRadius = "4px";
    });
  }

  newPassInput?.addEventListener("input", () => {
    const v = (newPassInput.value || "").trim();
    paintStrength(strengthLevel(v));
  });

  function validarPassword(pw) {
    return (
      pw.length >= 6 &&
      !pw.includes(" ") &&
      !["123456", "000000", "password"].includes(pw.toLowerCase())
    );
  }

  // Sesión recovery
  async function asegurarSesionRecovery() {
    if (!sb) {
      // Error del sistema: como no tenemos action real, mostramos action con "Reintentar"
      const decision = await actionSnack({
        message: "Supabase no está listo. Intenta de nuevo.",
        type: "error",
        confirmText: "Cerrar",
        cancelText: "",
        showCancel: false,
      });
      if (decision) closeSnack();
      return false;
    }

    const { data, error } = await sb.auth.getSession();
    if (error || !data?.session) {
      // Token expirado: NO autocierra, usuario decide
      const decision = await actionSnack({
        message: "Tu enlace de recuperación expiró. Vuelve a solicitar uno nuevo.",
        type: "error",
        confirmText: "Recuperar",
        cancelText: "Cerrar",
        showCancel: true,
      });

      closeSnack();

      if (decision === "confirm") {
        window.location.href = "forgot-password.html";
      }
      return false;
    }

    return true;
  }

  // Validación al cargar
  (async () => {
    await asegurarSesionRecovery();
  })();

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearError(newPassInput);
    clearError(confirmInput);

    const pw1 = (newPassInput?.value || "").trim();
    const pw2 = (confirmInput?.value || "").trim();

    let hasError = false;

    if (!pw1) {
      setError(newPassInput, "Ingresa tu nueva contraseña.");
      hasError = true;
    }
    if (!pw2) {
      setError(confirmInput, "Confirma tu nueva contraseña.");
      hasError = true;
    }
    if (hasError) return;

    if (!validarPassword(pw1)) {
      setError(newPassInput, "Contraseña no válida. Mínimo 6 caracteres, sin espacios.");
      return;
    }

    if (pw1 !== pw2) {
      setError(confirmInput, "Las contraseñas no coinciden.");
      return;
    }

    const ok = await asegurarSesionRecovery();
    if (!ok) return;

    setLoading(true);

    const { error } = await sb.auth.updateUser({ password: pw1 });

    if (error) {
      setLoading(false);
      setError(confirmInput, "No se pudo cambiar la contraseña. Intenta de nuevo.");
      return;
    }

    setLoading(false);

    localStorage.removeItem("cortero_recovery_phone");
    localStorage.removeItem("cortero_recovery_email");

    // Éxito: NO autocierra. Usuario decide y luego redirige.
    const decision = await actionSnack({
      message: "Contraseña actualizada correctamente. Presiona para ir a iniciar sesión.",
      type: "success",
      confirmText: "Ir a login",
      cancelText: "Cerrar",
      showCancel: true,
    });

    closeSnack();

    if (decision === "confirm") {
      window.location.href = "login.html";
    }
    // Si cierra, te deja en la misma página (como pediste).
  });

  // Toggle password
  document.querySelectorAll(".toggle-pass").forEach((icon) => {
    icon.addEventListener("click", () => {
      const target = document.getElementById(icon.dataset.target);
      if (!target) return;
      const visible = target.type === "password";
      target.type = visible ? "text" : "password";
      icon.textContent = visible ? "visibility_off" : "visibility";
    });
  });
})();
