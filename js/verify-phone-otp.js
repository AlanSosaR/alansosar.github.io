// ============================================================
// Verify Phone OTP — Café Cortero ☕
// Supabase Auth (SMS OTP)
// Archivo: verify-phone-otp.js
// HTML esperado:
//  - form#pinForm
//  - input#pinInput
//  - #timer
//  - #reenviarBtn
//  - #snackbar
// Requiere que antes esté cargado supabase-client-core.js
// ============================================================

(() => {
  const supa = window.supabaseClient;

  const form      = document.getElementById("pinForm");
  const otpInput  = document.getElementById("pinInput");
  const timerEl   = document.getElementById("timer");
  const resendBtn = document.getElementById("reenviarBtn");

  const phone = localStorage.getItem("cortero_recovery_phone");

  if (!supa) {
    console.error("Supabase client no está listo (window.supabaseClient).");
  }

  if (!phone) {
    window.location.href = "forgot-password.html";
    return;
  }

  /* ---------------- SNACKBAR ---------------- */
  function showSnackbar(message, type = "info", ms = 2400) {
    const el = document.getElementById("snackbar");
    if (!el) return;

    // Si usas tu snackbar M3 (con .snackbar + .hidden), mantenemos compatibilidad
    el.classList.remove("hidden", "show", "is-error", "is-success", "is-warn");
    if (type === "error") el.classList.add("is-error");
    if (type === "success") el.classList.add("is-success");

    el.textContent = message;

    // reflow
    void el.offsetWidth;

    el.classList.add("show");
    clearTimeout(window.__snackTimer);
    window.__snackTimer = setTimeout(() => {
      el.classList.remove("show");
      el.classList.add("hidden");
    }, ms);
  }

  /* ---------------- TIMER ---------------- */
  let timer = 60;
  let intervalId = null;

  function setResendDisabled(disabled) {
    if (!resendBtn) return;
    resendBtn.classList.toggle("disabled", disabled);
  }

  function startTimer() {
    if (!timerEl) return;

    // limpia timer anterior
    if (intervalId) clearInterval(intervalId);

    timer = 60;
    setResendDisabled(true);
    timerEl.textContent = `Reenviar código en ${timer}s`;

    intervalId = setInterval(() => {
      timer--;
      timerEl.textContent = `Reenviar código en ${timer}s`;

      if (timer <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        timerEl.textContent = "";
        setResendDisabled(false);
      }
    }, 1000);
  }

  startTimer();

  /* ---------------- REENVIAR OTP ---------------- */
  resendBtn?.addEventListener("click", async () => {
    if (resendBtn.classList.contains("disabled")) return;

    if (!supa) {
      showSnackbar("Supabase no está listo. Intenta de nuevo.", "error");
      return;
    }

    setResendDisabled(true);
    startTimer();

    const { error } = await supa.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false }
    });

    if (error) {
      console.error(error);
      showSnackbar("No se pudo reenviar el SMS. Revisa el número.", "error");
      // permitir reintentar sin esperar 60s si falló
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      if (timerEl) timerEl.textContent = "";
      setResendDisabled(false);
      return;
    }

    showSnackbar("Código reenviado ✔", "success");
  });

  /* ---------------- VERIFICAR OTP ---------------- */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const code = (otpInput?.value || "").trim();

    if (code.length !== 6) {
      otpInput?.closest(".m3-input")?.classList.add("error");
      showSnackbar("Código inválido", "error");
      return;
    }

    if (!supa) {
      showSnackbar("Supabase no está listo. Intenta de nuevo.", "error");
      return;
    }

    const { error } = await supa.auth.verifyOtp({
      phone,
      token: code,
      type: "sms"
    });

    if (error) {
      console.error(error);
      otpInput?.closest(".m3-input")?.classList.add("error");
      showSnackbar("Código incorrecto", "error");
      return;
    }

    showSnackbar("Teléfono verificado ✔", "success");

    setTimeout(() => {
      window.location.href = "new-password.html";
    }, 700);
  });

  /* ---------------- LIMPIAR ERROR AL ESCRIBIR ---------------- */
  otpInput?.addEventListener("input", () => {
    otpInput.closest(".m3-input")?.classList.remove("error");
  });
})();
