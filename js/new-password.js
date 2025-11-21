const supabase = window.supabaseClient;

const pass = document.getElementById("newPassword");
const confirmPass = document.getElementById("confirmPassword");
const bars = [bar1, bar2, bar3];

function snackbar(msg) {
  const s = document.getElementById("snackbar");
  s.textContent = msg;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2500);
}

/* ===== FUERZA DE CONTRASEÑA ===== */
pass.addEventListener("input", () => {
  let val = pass.value;
  let score =
    /[a-z]/.test(val) +
    /[A-Z]/.test(val) +
    /[0-9]/.test(val) +
    val.length >= 8;

  bars.forEach((b, i) => {
    b.style.background = i < score ? "#33673B" : "#ddd";
  });
});

/* ===== SUBMIT ===== */
document.getElementById("newPassForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (pass.value.length < 8) {
    snackbar("La contraseña debe tener al menos 8 caracteres");
    return;
  }

  if (pass.value !== confirmPass.value) {
    snackbar("Las contraseñas no coinciden");
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: pass.value
  });

  if (error) {
    snackbar("Error al actualizar");
    return;
  }

  snackbar("Contraseña actualizada ✔");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 900);
});
