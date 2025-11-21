const supabase = window.supabaseClient;
const pinInput = document.getElementById("pinInput");
const form = document.getElementById("pinForm");
const timerEl = document.getElementById("timer");
const resendBtn = document.getElementById("reenviarBtn");

let phone = localStorage.getItem("cc_recovery_phone");
let timer = 60;

function snackbar(msg) {
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2200);
}

/* TIMER */
const interval = setInterval(() => {
  timer--;
  timerEl.textContent = `Reenviar código en ${timer}s`;

  if (timer <= 0) {
    clearInterval(interval);
    timerEl.textContent = "";
    resendBtn.classList.remove("disabled");
  }
}, 1000);

/* REENVIAR */
resendBtn.addEventListener("click", async () => {
  resendBtn.classList.add("disabled");
  timer = 60;
  snackbar("Código reenviado ✔");

  await supabase.rpc("send_pin_sms", { phone_number: phone });
});

/* VERIFICAR */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pin = pinInput.value.trim();

  if (pin.length !== 6) {
    pinInput.closest(".m3-input").classList.add("error");
    return;
  }

  const { data, error } = await supabase.rpc("validate_pin", {
    phone_number: phone,
    pin_code: pin
  });

  if (error || !data || data.valid === false) {
    pinInput.closest(".m3-input").classList.add("error");
    snackbar("Código incorrecto");
    return;
  }

  snackbar("Código verificado ✔");
  setTimeout(() => {
    window.location.href = "new-password.html";
  }, 800);
});

/* Quitar error al escribir */
pinInput.addEventListener("input", () => {
  pinInput.closest(".m3-input").classList.remove("error");
});
