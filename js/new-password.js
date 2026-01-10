(() => {
  const sb = window.supabaseClient || window.supabase || null;

  const form = document.getElementById("newPassForm");
  if (!form || !sb) return;

  const newPassInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  const btn = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader = btn?.querySelector(".loader");

  const checklist = document.getElementById("passChecklist");

  /* =====================
     SNACKBAR
  ===================== */
  const snack = document.getElementById("snackbar");
  const snackMsg = snack?.querySelector(".snackbar__msg");
  const snackActions = snack?.querySelector(".snackbar__actions");

  let snackResolver = null;

  function openSnack(message, type = "info", { confirmText = "OK" } = {}) {
    if (!snack) return Promise.resolve();

    snack.classList.remove("hidden", "is-error", "is-warn", "is-success");
    snack.classList.add("show", `is-${type}`);
    snackMsg.textContent = message;

    const btnConfirm = snackActions.querySelector('[data-action="confirm"]');
    if (btnConfirm) btnConfirm.textContent = confirmText;

    return new Promise(resolve => {
      snackResolver = resolve;

      snackActions.onclick = () => {
        snack.classList.remove("show");
        snack.classList.add("hidden");
        resolve("confirm");
      };
    });
  }

  /* =====================
     ERRORES POR CAMPO
  ===================== */
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

  /* =====================
     LOADING
  ===================== */
  function setLoading(on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);
    if (btnText) btnText.style.opacity = on ? "0" : "1";
    if (loader) loader.style.display = on ? "inline-block" : "none";
  }

  /* =====================
     SESIÓN RECOVERY
  ===================== */
  async function asegurarSesionRecovery() {
    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      await openSnack(
        "El enlace de recuperación ha expirado.",
        "error",
        { confirmText: "Solicitar nuevo" }
      );
      window.location.href = "forgot-password.html";
      return false;
    }
    return true;
  }

  asegurarSesionRecovery();

  /* =====================
     CHECKLIST PASSWORD
  ===================== */
  function updateChecklist(pw) {
    if (!checklist) return false;

    const rules = {
      length: pw.length >= 8,
      letter: /[A-Za-z]/.test(pw),
      number: /[0-9]/.test(pw),
      space: !/\s/.test(pw),
    };

    let valid = true;

    checklist.querySelectorAll("li").forEach(li => {
      const rule = li.dataset.rule;
      if (rules[rule]) {
        li.classList.add("ok");
        li.classList.remove("bad");
      } else {
        li.classList.add("bad");
        li.classList.remove("ok");
        valid = false;
      }
    });

    return valid;
  }

  newPassInput.addEventListener("input", () => {
    const ok = updateChecklist(newPassInput.value);
    btn.disabled = !ok;
  });

  /* =====================
     MAPEO ERRORES SUPABASE
  ===================== */
  function mapSupabaseError(error) {
    const msg = error?.message || "";

    if (msg.includes("same password"))
      return "La nueva contraseña no puede ser igual a la anterior.";

    if (msg.includes("expired") || msg.includes("Invalid"))
      return "El enlace ya no es válido. Solicita uno nuevo.";

    return "No se pudo cambiar la contraseña. Inténtalo de nuevo.";
  }

  /* =====================
     SUBMIT
  ===================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearError(newPassInput);
    clearError(confirmInput);

    const pw1 = newPassInput.value.trim();
    const pw2 = confirmInput.value.trim();

    if (!pw1) return setError(newPassInput, "Ingresa tu nueva contraseña.");
    if (!pw2) return setError(confirmInput, "Confirma tu contraseña.");
    if (pw1 !== pw2)
      return setError(confirmInput, "Las contraseñas no coinciden.");

    const ok = await asegurarSesionRecovery();
    if (!ok) return;

    setLoading(true);

    const { error } = await sb.auth.updateUser({ password: pw1 });

    setLoading(false);

    if (error) {
      setError(newPassInput, mapSupabaseError(error));
      return;
    }

    /* 🔒 INVALIDAR ENLACE */
    await sb.auth.signOut();

    await openSnack(
      "Contraseña actualizada correctamente.",
      "success",
      { confirmText: "Iniciar sesión" }
    );

    window.location.href = "login.html";
  });

  /* =====================
     TOGGLE PASSWORD
  ===================== */
  document.querySelectorAll(".toggle-pass").forEach(icon => {
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
