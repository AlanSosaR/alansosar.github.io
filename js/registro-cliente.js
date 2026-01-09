// ============================================================
// REGISTRO DE CLIENTE — Café Cortero
// Supabase Auth v2 — Snackbar M3 Expressive (action, sin logo)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const sb = window.supabaseClient;
  if (!sb) {
    console.error("❌ Supabase no inicializado");
    return;
  }

  const form = document.getElementById("registroForm");
  if (!form) return;

  const campos = {
    nombre: document.getElementById("nombreInput"),
    correo: document.getElementById("correoInput"),
    telefono: document.getElementById("telefonoInput"),
    password: document.getElementById("passwordInput"),
    confirm: document.getElementById("confirmPasswordInput"),
  };

  const errores = {
    nombre: document.getElementById("errorNombre"),
    correo: document.getElementById("errorCorreo"),
    telefono: document.getElementById("errorTelefono"),
    password: document.getElementById("errorPassword"),
    confirm: document.getElementById("errorConfirm"),
  };

  // =========================
  // Snackbar Action (sin autocierre)
  // =========================
  const snackbarEl = document.getElementById("snackbar");
  const snackMsgEl = snackbarEl?.querySelector(".snackbar__msg");
  const snackActionsEl = snackbarEl?.querySelector(".snackbar__actions");

  function openSnackbar(message, type = "info") {
    if (!snackbarEl) return;

    snackbarEl.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");
    if (type === "error") snackbarEl.classList.add("is-error");
    if (type === "warn") snackbarEl.classList.add("is-warn");
    if (type === "success") snackbarEl.classList.add("is-success");

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
  }

  function actionSnackbar({
    message,
    type = "info",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    showCancel = true,
  }) {
    return new Promise((resolve) => {
      if (!snackbarEl || !snackActionsEl || !snackMsgEl) {
        // fallback mínimo si no existe el snackbar action
        alert(message);
        resolve("confirm");
        return;
      }

      // mostrar acciones
      snackActionsEl.style.display = "inline-flex";

      const btnCancel = snackActionsEl.querySelector('[data-action="cancel"]');
      const btnConfirm = snackActionsEl.querySelector('[data-action="confirm"]');

      if (btnConfirm) btnConfirm.textContent = confirmText;

      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.style.display = showCancel ? "" : "none";
      }

      openSnackbar(message, type);

      const onClick = (e) => {
        const b = e.target.closest("button");
        if (!b) return;

        const action = b.dataset.action;
        if (!action) return;

        snackActionsEl.removeEventListener("click", onClick);
        closeSnackbar();

        resolve(action === "confirm" ? "confirm" : "cancel");
      };

      snackActionsEl.addEventListener("click", onClick);
    });
  }

  // =========================
  // Helpers UI por campo
  // =========================
  function marcar(campo, mensaje = "", ok = false) {
    const input = campos[campo];
    const box = input?.closest(".m3-input");
    if (!input || !box) return;

    box.classList.remove("error", "success");

    if (ok) {
      box.classList.add("success");
      if (errores[campo]) errores[campo].textContent = "";
    } else if (mensaje) {
      box.classList.add("error");
      if (errores[campo]) errores[campo].textContent = mensaje;
    } else {
      if (errores[campo]) errores[campo].textContent = "";
    }
  }

  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // =========================
  // Validaciones en vivo
  // =========================
  campos.nombre?.addEventListener("input", () =>
    marcar("nombre", "", (campos.nombre.value || "").trim().length >= 2)
  );

  campos.correo?.addEventListener("input", () =>
    marcar("correo", "", emailValido((campos.correo.value || "").trim()))
  );

  campos.telefono?.addEventListener("input", () =>
    marcar("telefono", "", (campos.telefono.value || "").trim().length >= 8)
  );

  campos.password?.addEventListener("input", () =>
    marcar("password", "", (campos.password.value || "").length >= 6)
  );

  campos.confirm?.addEventListener("input", () =>
    marcar("confirm", "", (campos.confirm.value || "") === (campos.password.value || ""))
  );

  // =========================
  // Barra seguridad (6 niveles)
  // =========================
  const barsContainer = document.getElementById("barsContainer");
  const bars = barsContainer ? barsContainer.querySelectorAll(".strength-bar") : [];

  function nivelSeguridad(pass) {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (pass.length >= 12) score++;
    return Math.min(score, 6);
  }

  if (campos.password && barsContainer) {
    campos.password.addEventListener("input", () => {
      const val = (campos.password.value || "").trim();

      if (!val) {
        barsContainer.style.display = "none";
        bars.forEach((bar) => (bar.className = "strength-bar"));
        return;
      }

      barsContainer.style.display = "flex";
      const nivel = nivelSeguridad(val);

      bars.forEach((bar, i) => {
        bar.className = "strength-bar";
        if (i < nivel) bar.classList.add(`level-${nivel}`);
      });
    });
  }

  // =========================
  // Loader botón
  // =========================
  const btn = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader = btn?.querySelector(".loader");

  function loading(on) {
    if (!btn) return;
    btn.disabled = !!on;
    btn.classList.toggle("loading", !!on);
    if (btnText) btnText.style.opacity = on ? "0" : "1";
    if (loader) loader.style.display = on ? "inline-block" : "none";
  }

  // =========================
  // Submit
  // =========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = (campos.nombre?.value || "").trim();
  const correo = (campos.correo?.value || "").trim();
  const tel    = (campos.telefono?.value || "").trim();
  const pass   = campos.password?.value || "";
  const conf   = campos.confirm?.value || "";

  if (!nombre) return marcar("nombre", "Ingresa tu nombre");
  if (!emailValido(correo)) return marcar("correo", "Correo no válido");
  if (tel.length < 8) return marcar("telefono", "Teléfono no válido");
  if (pass.length < 6) return marcar("password", "Mínimo 6 caracteres");
  if (pass !== conf) return marcar("confirm", "Las contraseñas no coinciden");

  loading(true);

  try {
    const { error } = await sb.auth.signUp({
      email: correo,
      password: pass,
      options: {
        data: {
          name: nombre,
          phone: tel,
          country: "Honduras",
          photo_url: "/imagenes/avatar-default.svg",
        },
        // emailRedirectTo: `${window.location.origin}/login.html`,
      },
    });

    if (error) throw error;

    loading(false);

    // ✅ Snackbar NO autocierra
    const decision = await actionSnackbar({
      message:
        "Cuenta creada correctamente. Te enviamos un correo para confirmar tu cuenta. " +
        "Si no lo ves en tu bandeja principal, revisa la carpeta de spam.",
      type: "success",
      confirmText: "Confirmar",
      showCancel: false,
    });

    // Solo continúa cuando el usuario confirma
    if (decision === "confirm") {
      closeSnackbar();
      window.location.href = "login.html";
    }

  } catch (err) {
    console.error("❌ Registro:", err);
    loading(false);

    const msg = err?.message || "";

    if (msg.includes("already registered")) {
      marcar("correo", "Este correo ya está registrado");
      return;
    }

    if (msg.includes("users_phone_unique")) {
      marcar("telefono", "Este teléfono ya está registrado");
      return;
    }

    // Error genérico (NO autocierra)
    await actionSnackbar({
      message:
        "No se pudo crear la cuenta. Intenta de nuevo más tarde.",
      type: "error",
      confirmText: "Cerrar",
      showCancel: false,
    });

    closeSnackbar();
  }
});

  // =========================
  // Toggle password
  // =========================
  document.querySelectorAll(".toggle-pass").forEach((icon) => {
    icon.addEventListener("click", () => {
      const target = document.getElementById(icon.dataset.target);
      if (!target) return;

      const show = target.type === "password";
      target.type = show ? "text" : "password";
      icon.textContent = show ? "visibility" : "visibility_off";
    });
  });
});
