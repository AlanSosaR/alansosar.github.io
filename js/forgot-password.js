/* ============================================================
   New Password — Café Cortero ☕ (CORREGIDO)
   ✔ Reset por correo (resetPasswordForEmail)
   ✔ Reset por teléfono (OTP verificado)
   ✔ Snackbar Material 3 (mismo sistema del carrito)
   ✔ Valida sesión de recuperación (si no hay, redirige)
   ✔ Sin conflictos globales
============================================================ */

(() => {
  const sb = window.supabaseClient;

  const form = document.getElementById("newPassForm");
  if (!form) return;

  const newPassInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  const btn = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader = btn?.querySelector(".loader");

  /* ================= SNACKBAR (GENÉRICO) =================
     Requiere HTML:
     <div id="snackbar" class="snackbar hidden"></div>
     y CSS con .snackbar.show + .snackbar.hidden
  ======================================================== */
  function showSnackbar(message, type = "info", ms = 2600) {
    const el = document.getElementById("snackbar");
    if (!el) return;

    // Mantener el sistema hidden/show como en carrito
    el.classList.remove("hidden", "show", "is-error", "is-warn", "is-success");

    if (type === "error") el.classList.add("is-error");
    if (type === "warn") el.classList.add("is-warn");
    if (type === "success") el.classList.add("is-success");

    el.textContent = message;

    // Reflow para reiniciar animación
    void el.offsetWidth;

    el.classList.add("show");

    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      el.classList.remove("show");
      el.classList.add("hidden");
    }, ms);
  }

  /* ================= VALIDACIÓN ================= */
  function validarPassword(pw) {
    return (
      pw.length >= 6 &&
      !pw.includes(" ") &&
      !["123456", "000000", "password"].includes(pw.toLowerCase())
    );
  }

  function activarLoading() {
    btn?.classList.add("loading");
    if (btnText) btnText.style.opacity = "0";
    if (loader) loader.style.display = "inline-block";
  }

  function desactivarLoading() {
    btn?.classList.remove("loading");
    if (btnText) btnText.style.opacity = "1";
    if (loader) loader.style.display = "none";
  }

  /* ================= VALIDAR SESIÓN RECOVERY =================
     Si el usuario llega directo a esta página sin flujo de reset,
     no habrá sesión y updateUser fallará.
  ============================================================ */
  async function asegurarSesionRecovery() {
    if (!sb) {
      showSnackbar("Supabase no está listo. Intenta recargar.", "error", 3200);
      return false;
    }

    const { data, error } = await sb.auth.getSession();
    if (error || !data?.session) {
      showSnackbar(
        "Sesión de recuperación expirada. Vuelve a recuperar tu contraseña.",
        "error",
        3200
      );
      setTimeout(() => (window.location.href = "forgot-password.html"), 1200);
      return false;
    }

    return true;
  }

  /* ================= INIT ================= */
  (async () => {
    await asegurarSesionRecovery();
  })();

  /* ================= SUBMIT ================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pw1 = (newPassInput?.value || "").trim();
    const pw2 = (confirmInput?.value || "").trim();

    if (!pw1 || !pw2) {
      showSnackbar("Completa ambos campos.", "warn");
      return;
    }

    if (!validarPassword(pw1)) {
      showSnackbar("Contraseña no válida.", "error");
      return;
    }

    if (pw1 !== pw2) {
      showSnackbar("Las contraseñas no coinciden.", "error");
      return;
    }

    // Re-validar sesión justo antes de guardar
    const okSesion = await asegurarSesionRecovery();
    if (!okSesion) return;

    activarLoading();

    const { error } = await sb.auth.updateUser({ password: pw1 });

    if (error) {
      console.error("❌ updateUser error:", error);
      desactivarLoading();
      showSnackbar("No se pudo cambiar la contraseña.", "error", 3000);
      return;
    }

    desactivarLoading();
    showSnackbar("Contraseña actualizada ✔", "success", 2200);

    // Limpieza del estado de recuperación
    localStorage.removeItem("cortero_recovery_phone");
    localStorage.removeItem("cortero_recovery_email");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1100);
  });

  /* ================= TOGGLE PASSWORD ================= */
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
