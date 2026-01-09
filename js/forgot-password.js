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

  const snackbarEl = document.getElementById("snackbar");
  const snackMsgEl = snackbarEl?.querySelector(".snackbar__msg");

  function showSnackbar(message, type = "info", ms = 2600) {
    if (!snackbarEl) return;
    snackbarEl.className = `snackbar show is-${type}`;
    snackMsgEl.textContent = message;
    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      snackbarEl.classList.remove("show");
    }, ms);
  }

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

  function setLoading(on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);
    if (btnText) btnText.style.opacity = on ? "0" : "1";
    if (loader) loader.style.display = on ? "inline-block" : "none";
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
  }

  function isPhone(v) {
    return /^\+?\d{7,15}$/.test(v.replace(/[\s-]/g, ""));
  }

  input.addEventListener("input", clearFieldError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldError();

    const value = input.value.trim();

    if (!value) {
      setFieldError("Ingresa tu correo electrónico.");
      return;
    }

    // 🚫 TELÉFONO NO DISPONIBLE
    if (isPhone(value) && !isEmail(value)) {
      setFieldError("La recuperación por teléfono no está disponible por el momento.");
      return;
    }

    // ❌ FORMATO INVÁLIDO
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
        showSnackbar("No se pudo enviar el correo. Intenta más tarde.", "error", 3200);
        return;
      }

      // Mensaje seguro (no confirma existencia)
      showSnackbar(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
        "success",
        4200
      );

      input.value = "";
    } catch (err) {
      console.error(err);
      setLoading(false);
      showSnackbar("Error inesperado. Intenta de nuevo.", "error", 3200);
    }
  });
})();
