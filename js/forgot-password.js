/* ============================================================
   New Password — Café Cortero ☕
   ✔ Reset por correo (resetPasswordForEmail)
   ✔ Reset por teléfono (OTP verificado)
   ✔ Sin conflictos de variables globales
   ✔ Compatible con Supabase Auth v2
============================================================ */

(() => {
  const sb = window.supabaseClient;
  if (!sb) return;

  const form = document.getElementById("newPassForm");
  if (!form) return;

  const newPassInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  const btn = form.querySelector(".m3-btn");
  const btnText = btn?.querySelector(".btn-text");
  const loader = btn?.querySelector(".loader");

  /* ================= SNACKBAR ================= */
  function showSnackbar(msg, type = "info", ms = 2600) {
    const s = document.getElementById("snackbar");
    if (!s) return;

    s.className = "snackbar";
    if (type === "error") s.classList.add("error");
    if (type === "success") s.classList.add("success");

    s.textContent = msg;
    void s.offsetWidth;
    s.classList.add("show");

    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      s.classList.remove("show");
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

  /* ================= SUBMIT ================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pw1 = newPassInput.value.trim();
    const pw2 = confirmInput.value.trim();

    if (!pw1 || !pw2) {
      showSnackbar("Completa ambos campos", "error");
      return;
    }

    if (!validarPassword(pw1)) {
      showSnackbar("Contraseña no válida", "error");
      return;
    }

    if (pw1 !== pw2) {
      showSnackbar("Las contraseñas no coinciden", "error");
      return;
    }

    activarLoading();

    // 🔐 ACTUALIZAR CONTRASEÑA (correo o teléfono)
    const { error } = await sb.auth.updateUser({
      password: pw1
    });

    if (error) {
      console.error(error);
      desactivarLoading();
      showSnackbar("No se pudo cambiar la contraseña", "error");
      return;
    }

    showSnackbar("Contraseña actualizada ✔", "success");

    // Limpieza del estado de recuperación
    localStorage.removeItem("cortero_recovery_phone");
    localStorage.removeItem("cortero_recovery_email");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  });

  /* ================= TOGGLE PASSWORD ================= */
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const target = document.getElementById(icon.dataset.target);
      if (!target) return;

      const visible = target.type === "password";
      target.type = visible ? "text" : "password";
      icon.textContent = visible ? "visibility_off" : "visibility";
    });
  });

})();
