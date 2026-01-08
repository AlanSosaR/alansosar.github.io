(() => {
  const sb = window.supabaseClient || window.supabase || null;

  const form          = document.getElementById("newPassForm");
  if (!form) return;

  const newPassInput  = document.getElementById("newPassword");
  const confirmInput  = document.getElementById("confirmPassword");

  const btn           = form.querySelector(".m3-btn");
  const btnText       = btn?.querySelector(".btn-text");
  const loader        = btn?.querySelector(".loader");

  // Snackbar (solo para éxito final o token expirado)
  const snack     = document.getElementById("snackbar");
  const snackMsg  = snack?.querySelector(".snackbar__msg");

  function showSnackbar(message, type = "info", ms = 2600) {
    if (!snack || !snackMsg) return;
    snack.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");
    if (type === "error")   snack.classList.add("is-error");
    if (type === "success") snack.classList.add("is-success");
    snackMsg.textContent = message;
    void snack.offsetWidth;
    snack.classList.add("show");
    setTimeout(() => {
      snack.classList.remove("show");
      snack.classList.add("hidden");
    }, ms);
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
    const { box, msg } = fieldParts(inputEl);
    box?.classList.remove("error");
    if (msg) msg.textContent = "";
  }

  function setError(inputEl, text) {
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
    if (loader)  loader.style.display   = on ? "inline-block" : "none";
  }

  // Password strength (0–3)
  const bar1 = document.getElementById("bar1");
  const bar2 = document.getElementById("bar2");
  const bar3 = document.getElementById("bar3");

  function strengthLevel(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++; // mayúscula o símbolo
    if (pw.length >= 10 && /[0-9]/.test(pw)) score++;         // largo + dígito
    return Math.max(0, Math.min(score, 3));
  }

  function paintStrength(level) {
    [bar1, bar2, bar3].forEach((el, i) => {
      if (!el) return;
      el.className = ""; // limpia clases previas
      el.style.background = i < level ? (level === 1 ? "#f6c343" : level === 2 ? "#33c26b" : "#1e8f57") : "#e1e1e1";
      el.style.transition = ".25s";
      el.style.borderRadius = "4px";
    });
  }

  newPassInput?.addEventListener("input", () => {
    const v = (newPassInput.value || "").trim();
    paintStrength(strengthLevel(v));
  });

  // Reglas de password (para validación)
  function validarPassword(pw) {
    return (
      pw.length >= 6 &&
      !pw.includes(" ") &&
      !["123456", "000000", "password"].includes(pw.toLowerCase())
    );
  }

  // Sesión recovery (token/OTP)
  async function asegurarSesionRecovery() {
    if (!sb) {
      showSnackbar("Supabase no está listo. Revisa tus scripts.", "error", 3200);
      return false;
    }
    const { data, error } = await sb.auth.getSession();
    if (error || !data?.session) {
      showSnackbar("Tu enlace de recuperación expiró. Vuelve a recuperar tu contraseña.", "error", 3600);
      setTimeout(() => (window.location.href = "forgot-password.html"), 1200);
      return false;
    }
    return true;
  }

  // Valida al cargar
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
      // error general del servidor: marca en confirm
      setLoading(false);
      setError(confirmInput, "No se pudo cambiar la contraseña. Intenta de nuevo.");
      return;
    }

    setLoading(false);

    // Limpieza de flags opcionales
    localStorage.removeItem("cortero_recovery_phone");
    localStorage.removeItem("cortero_recovery_email");

    // Solo snackbar de éxito y redirección a login
    showSnackbar("Contraseña actualizada. Redirigiendo a iniciar sesión…", "success", 1800);
    setTimeout(() => (window.location.href = "login.html"), 900);
  });
})();
