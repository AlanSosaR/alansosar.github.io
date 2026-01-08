// ============================================================
// Verify Phone OTP — Café Cortero ☕
// Supabase Auth (SMS OTP)
// Archivo: verify-phone-otp.js
// ============================================================

const form      = document.getElementById("otpForm");
const otpInput  = document.getElementById("otpInput");
const timerEl   = document.getElementById("timer");
const resendBtn = document.getElementById("reenviarBtn");

const phone = localStorage.getItem("cortero_recovery_phone");

/* ------------------- Guard: phone requerido ------------------- */
if (!phone) {
  window.location.href = "forgot-password.html";
}

/* ------------------- Esperar Supabase ------------------- */
function waitSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve(window.supabaseClient);
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve(window.supabaseClient);
      }
    }, 60);
  });
}

/* ------------------- Snackbar (Material 3 Expressive) ------------------- */
function showSnackbar(msg, type = "info", ms = 2400) {
  const s = document.getElementById("snackbar");
  if (!s) return;

  s.classList.remove("hidden", "show", "is-error", "is-success", "is-warn");
  if (type === "error") s.classList.add("is-error");
  if (type === "success") s.classList.add("is-success");
  if (type === "warn") s.classList.add("is-warn");

  s.textContent = msg;

  // reflow
  void s.offsetWidth;

  s.classList.add("show");

  clearTimeout(window.__snackTimer);
  window.__snackTimer = setTimeout(() => {
    s.classList.remove("show");
    s.classList.add("hidden");
  }, ms);
}

/* ------------------- Timer (único) ------------------- */
let timer = 60;
let intervalId = null;

function startTimer(seconds = 60) {
  timer = seconds;
  resendBtn.classList.add("disabled");
  timerEl.textContent = `Reenviar código en ${timer}s`;

  if (intervalId) clearInterval(intervalId);

  intervalId = setInterval(() => {
    timer--;
    if (timer > 0) {
      timerEl.textContent = `Reenviar código en ${timer}s`;
      return;
    }

    clearInterval(intervalId);
    intervalId = null;
    timerEl.textContent = "";
    resendBtn.classList.remove("disabled");
  }, 1000);
}

/* ------------------- Init ------------------- */
(async function init() {
  const sb = await waitSupabase();
  if (!sb) {
    showSnackbar("Supabase no está listo. Intenta de nuevo.", "error");
    return;
  }

  // Arranca timer al entrar
  startTimer(60);

  /* ------------------- Reenviar OTP ------------------- */
  resendBtn.addEventListener("click", async () => {
    if (resendBtn.classList.contains("disabled")) return;

    try {
      // Reiniciar timer primero (UX)
      startTimer(60);

      const { error } = await sb.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false }
      });

      if (error) {
        showSnackbar("No se pudo reenviar el código.", "error");
        // permitir reintento inmediato si falla
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        timerEl.textContent = "";
        resendBtn.classList.remove("disabled");
        return;
      }

      showSnackbar("Código reenviado ✔", "success", 2000);

    } catch (e) {
      console.error("❌ Reenviar OTP:", e);
      showSnackbar("Error al reenviar. Intenta de nuevo.", "error");
      timerEl.textContent = "";
      resendBtn.classList.remove("disabled");
    }
  });

  /* ------------------- Verificar OTP ------------------- */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const code = (otpInput?.value || "").trim();

    if (code.length !== 6) {
      otpInput?.closest(".m3-input")?.classList.add("error");
      showSnackbar("Código inválido (6 dígitos).", "warn");
      return;
    }

    try {
      const { error } = await sb.auth.verifyOtp({
        phone,
        token: code,
        type: "sms"
      });

      if (error) {
        otpInput?.closest(".m3-input")?.classList.add("error");
        showSnackbar("Código incorrecto.", "error");
        return;
      }

      showSnackbar("Teléfono verificado ✔", "success");

      setTimeout(() => {
        window.location.href = "new-password.html";
      }, 700);

    } catch (err) {
      console.error("❌ verifyOtp:", err);
      showSnackbar("No se pudo verificar el código.", "error");
    }
  });

  /* ------------------- Limpiar error al escribir ------------------- */
  otpInput?.addEventListener("input", () => {
    otpInput.closest(".m3-input")?.classList.remove("error");
  });
})();
