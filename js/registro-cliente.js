// ============================================================
// REGISTRO DE CLIENTE — Café Cortero
// Supabase Auth v2 — FINAL ESTABLE 2025
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧾 registro-cliente.js — versión final estable");

  const sb = window.supabaseClient;
  if (!sb) {
    console.error("❌ Supabase no inicializado");
    return;
  }

  const form = document.getElementById("registroForm");

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

  /* =========================================================
     HELPERS UI
  ========================================================= */
  function marcar(campo, mensaje = "", ok = false) {
    const input = campos[campo];
    const box = input.closest(".m3-input");

    box.classList.remove("error", "success");

    if (ok) {
      box.classList.add("success");
      errores[campo].textContent = "";
    } else if (mensaje) {
      box.classList.add("error");
      errores[campo].textContent = mensaje;
    } else {
      errores[campo].textContent = "";
    }
  }

  function mostrarSnackbar(msg) {
    const bar = document.getElementById("snackbar");
    if (!bar) return;

    bar.innerHTML = `
      <img src="imagenes/logo_secundario.png" class="snack-logo">
      <span>${msg}</span>
    `;
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 3000);
  }

  /* =========================================================
     VALIDACIONES EN VIVO
  ========================================================= */
  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  campos.nombre.addEventListener("input", () =>
    marcar("nombre", "", campos.nombre.value.trim().length >= 2)
  );

  campos.correo.addEventListener("input", () =>
    marcar("correo", "", emailValido(campos.correo.value.trim()))
  );

  campos.telefono.addEventListener("input", () =>
    marcar("telefono", "", campos.telefono.value.trim().length >= 8)
  );

  campos.password.addEventListener("input", () =>
    marcar("password", "", campos.password.value.length >= 6)
  );

  campos.confirm.addEventListener("input", () =>
    marcar("confirm", "", campos.confirm.value === campos.password.value)
  );

  /* =========================================================
     LOADER BOTÓN
  ========================================================= */
  const btn = document.querySelector(".m3-btn");
  const btnText = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".loader");

  function loading(on) {
    btn.disabled = on;
    loader.style.opacity = on ? "1" : "0";
    btnText.style.opacity = "1";
  }

  /* =========================================================
     SUBMIT — REGISTRO REAL
  ========================================================= */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = campos.nombre.value.trim();
    const correo = campos.correo.value.trim();
    const tel = campos.telefono.value.trim();
    const pass = campos.password.value;
    const conf = campos.confirm.value;

    if (!nombre) return marcar("nombre", "Ingresa tu nombre");
    if (!emailValido(correo)) return marcar("correo", "Correo no válido");
    if (tel.length < 8) return marcar("telefono", "Teléfono no válido");
    if (pass.length < 6) return marcar("password", "Mínimo 6 caracteres");
    if (pass !== conf) return marcar("confirm", "No coinciden");

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
            photo_url: "/imagenes/avatar-default.svg"
          }
        }
      });

      if (error) throw error;

      mostrarSnackbar("Cuenta creada ✔ Revisa tu correo ✉️");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1800);

    } catch (err) {
      console.error("❌ Registro:", err);

      if (err.message?.includes("already registered")) {
        marcar("correo", "Este correo ya existe");
      } else {
        mostrarSnackbar("Error al crear la cuenta");
      }

      loading(false);
    }
  });

  /* =========================================================
     TOGGLE PASSWORD
  ========================================================= */
  document.querySelectorAll(".toggle-pass").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      if (!input) return;

      const show = input.type === "password";
      input.type = show ? "text" : "password";
      icon.textContent = show ? "visibility" : "visibility_off";
    });
  });
});
