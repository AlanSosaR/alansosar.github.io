// ============================================================
// PERFIL — HOTFIX 2025 con validaciones avanzadas
// ============================================================
console.log("🛠 perfil.js — HOTFIX depuración/timeout + password UI");

// -------------------------
// Utilidades básicas
// -------------------------
function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

function saveUserLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

function showSnack(msg) {
  const bar = document.getElementById("snackbar");
  if (!bar) return;
  const span = bar.querySelector(".snack-text");
  if (span) span.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 3000);
}

function paintProfile(user) {
  if (!user) return;
  const n = document.getElementById("nombreInput");
  const c = document.getElementById("correoInput");
  const t = document.getElementById("telefonoInput");
  const f = document.getElementById("fotoPerfil");
  if (n) n.value = user.name || "";
  if (c) c.value = user.email || "";
  if (t) t.value = user.phone || "";
  if (f) f.src = user.photo_url || "imagenes/avatar-default.svg";
}

// Label en rojo / verde / normal
function markLabel(input, color) {
  if (!input) return;
  const label = input.parentElement?.querySelector(".floating-label");
  if (!label) return;
  label.style.color = color || "";
}

// Timeout para promesas (evita loader infinito)
function withTimeout(promise, ms = 12000, label = "operación") {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`⏳ Timeout (${label}) después de ${ms}ms`)), ms)
    ),
  ]);
}

// -------------------------
// UI: Mostrar / ocultar contraseña
// -------------------------
function attachPasswordToggle(input) {
  if (!input) return;
  const wrapper = input.parentElement;
  if (!wrapper) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "password-toggle-btn";
  btn.style.border = "none";
  btn.style.background = "transparent";
  btn.style.cursor = "pointer";
  btn.style.outline = "none";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.padding = "0 8px";
  btn.style.webkitTapHighlightColor = "transparent";

  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined";
  icon.textContent = "visibility_off";

  btn.appendChild(icon);
  wrapper.appendChild(btn);

  btn.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    icon.textContent = isPassword ? "visibility" : "visibility_off";
  });
}

// -------------------------
// UI: Barra de fuerza de contraseña
// -------------------------
function attachPasswordStrength(input) {
  if (!input) return;

  const field = input.closest(".m3-field") || input.parentElement;

  const container = document.createElement("div");
  container.className = "password-strength";
  container.style.marginTop = "4px";

  const bar = document.createElement("div");
  bar.className = "password-strength-bar";
  bar.style.height = "4px";
  bar.style.borderRadius = "999px";
  bar.style.overflow = "hidden";
  bar.style.background = "rgba(0,0,0,0.08)";

  const fill = document.createElement("div");
  fill.className = "password-strength-fill";
  fill.style.height = "100%";
  fill.style.width = "0%";
  fill.style.transition = "width 0.25s ease, background-color 0.25s ease";

  bar.appendChild(fill);

  const label = document.createElement("div");
  label.className = "password-strength-label";
  label.style.fontSize = "0.75rem";
  label.style.marginTop = "2px";
  label.style.opacity = "0.85";

  container.appendChild(bar);
  container.appendChild(label);
  field.appendChild(container);

  function evalStrength(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    let pct = "0%";
    let text = "";
    let color = "rgba(0,0,0,0.15)";

    if (!value) {
      pct = "0%";
      text = "";
    } else if (score <= 1) {
      pct = "25%";
      text = "Contraseña débil";
      color = "#B3261E";
    } else if (score === 2 || score === 3) {
      pct = "60%";
      text = "Contraseña media";
      color = "#E4A11B";
    } else {
      pct = "100%";
      text = "Contraseña fuerte";
      color = "#33673B";
    }

    fill.style.width = pct;
    fill.style.backgroundColor = color;
    label.textContent = text;
  }

  input.addEventListener("input", () => evalStrength(input.value));
  evalStrength(input.value || "");
}

// -------------------------
// Lógica principal de perfil
// -------------------------
(function initPerfil() {
  console.log("⚙️ Iniciando pantalla de perfil…");

  const user = getUserLS();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  paintProfile(user);

  const sb = window.supabaseClient;
  if (!sb) {
    console.error("❌ Supabase no inicializado");
    showSnack("Error Supabase");
    return;
  }

  const fotoInput      = document.getElementById("inputFoto");
  const fotoPerfil     = document.getElementById("fotoPerfil");
  const saveBtn        = document.getElementById("saveBtn");
  const loader         = saveBtn ? saveBtn.querySelector(".loader") : null;
  const btnText        = saveBtn ? saveBtn.querySelector(".btn-text") : null;
  const btnMostrarPass = document.getElementById("btnMostrarPass");
  const bloquePassword = document.getElementById("bloquePassword");
  const oldPassword    = document.getElementById("oldPassword");
  const newPassword    = document.getElementById("newPassword");
  const passConfirm    = document.getElementById("passConfirm");

  if (!saveBtn) {
    console.error("❌ Falta #saveBtn");
    return;
  }

  // -------------------------
  // Estado de validación de contraseña actual
  // -------------------------
  let oldPasswordValid = false;
  let oldPasswordChecking = false;

  // Mensaje bajo "Contraseña actual"
  let oldPassStatusEl = null;
  if (oldPassword) {
    const field = oldPassword.closest(".m3-field") || oldPassword.parentElement;
    oldPassStatusEl = document.createElement("div");
    oldPassStatusEl.id = "oldPasswordStatus";
    oldPassStatusEl.style.fontSize = "0.75rem";
    oldPassStatusEl.style.marginTop = "2px";
    field.appendChild(oldPassStatusEl);
  }

  function setOldPassStatus(text, color) {
    if (!oldPassStatusEl) return;
    oldPassStatusEl.textContent = text || "";
    oldPassStatusEl.style.color = color || "";
  }

  // -------------------------
  // FOTO
  // -------------------------
  let nuevaFoto = null;

  if (fotoPerfil && fotoInput) {
    fotoPerfil.onclick = () => fotoInput.click();
    fotoInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      nuevaFoto = file;
      fotoPerfil.src = URL.createObjectURL(file);
      console.log("📸 Nueva foto seleccionada");
    };
  }

  // -------------------------
  // Toggle bloque de contraseña
  // -------------------------
  if (btnMostrarPass && bloquePassword) {
    btnMostrarPass.onclick = () => {
      const visible = getComputedStyle(bloquePassword).display !== "none";
      bloquePassword.style.display = visible ? "none" : "block";
      bloquePassword.style.opacity = visible ? "0" : "1";
    };
  }

  // -------------------------
  // Toggler de mostrar contraseña + fuerza
  // -------------------------
  attachPasswordToggle(oldPassword);
  attachPasswordToggle(newPassword);
  attachPasswordToggle(passConfirm);

  attachPasswordStrength(newPassword);

  // -------------------------
  // Loader botón guardar
  // -------------------------
  function startLoading() {
    if (loader) {
      loader.style.display = "inline-block";
      loader.style.opacity = "1";
    }
    if (btnText) btnText.style.opacity = "0";
    saveBtn.disabled = true;
  }

  function stopLoading() {
    if (loader) {
      loader.style.display = "none";
      loader.style.opacity = "0";
    }
    if (btnText) btnText.style.opacity = "1";
    saveBtn.disabled = false;
  }

  // -------------------------
  // Validar contraseña actual contra Supabase
  // -------------------------
  async function validarPasswordActual(showMessages = true) {
    if (!oldPassword || !user?.email) {
      oldPasswordValid = false;
      return false;
    }

    const value = oldPassword.value.trim();
    if (!value) {
      oldPasswordValid = false;
      markLabel(oldPassword, "#B3261E");
      setOldPassStatus("Escribe tu contraseña actual", "#B3261E");
      return false;
    }

    if (oldPasswordChecking) {
      return oldPasswordValid;
    }

    oldPasswordChecking = true;
    markLabel(oldPassword, "");
    setOldPassStatus("Verificando contraseña…", "rgba(0,0,0,0.6)");

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: user.email,
        password: value,
      });

      if (error || !data?.session) {
        oldPasswordValid = false;
        markLabel(oldPassword, "#B3261E");
        setOldPassStatus("Contraseña actual incorrecta", "#B3261E");
        if (showMessages) showSnack("Contraseña actual incorrecta");
        return false;
      }

      oldPasswordValid = true;
      markLabel(oldPassword, "#33673B");
      setOldPassStatus("Contraseña actual confirmada", "#33673B");
      if (showMessages) showSnack("Contraseña actual confirmada");
      return true;
    } catch (err) {
      console.error("❌ Error verificando contraseña actual:", err);
      oldPasswordValid = false;
      markLabel(oldPassword, "#B3261E");
      setOldPassStatus("Error verificando contraseña", "#B3261E");
      if (showMessages) showSnack("Error verificando contraseña");
      return false;
    } finally {
      oldPasswordChecking = false;
    }
  }

  if (oldPassword) {
    oldPassword.addEventListener("input", () => {
      // Si vuelve a escribir, reseteamos el estado
      oldPasswordValid = false;
      markLabel(oldPassword, "");
      setOldPassStatus("", "");
    });

    // Cuando termina de escribir y sale del campo → validamos
    oldPassword.addEventListener("blur", () => {
      if (oldPassword.value.trim()) {
        validarPasswordActual(false);
      }
    });
  }

  // -------------------------
  // Sonda rápida: ¿existe tu fila en users?
  // -------------------------
  async function probeRow() {
    console.time("⏱ probe SELECT");
    const { data, error } = await withTimeout(
      sb.from("users").select("id").eq("id", user.id).maybeSingle(),
      12000,
      "SELECT de sondeo"
    );
    console.timeEnd("⏱ probe SELECT");
    if (error) {
      console.error("❌ Probe SELECT error:", error);
      showSnack(`Error SELECT: ${error.message || error}`);
      throw error;
    }
    if (!data) {
      const msg = "No existe tu fila en users (id != auth.uid()).";
      console.warn(msg);
      showSnack(msg);
      throw new Error(msg);
    }
    console.log("✅ Probe OK. id:", data.id);
    return true;
  }

  // -------------------------
  // Subir foto (si aplica)
  // -------------------------
  async function subirFotoSiAplica() {
    if (!nuevaFoto) return user.photo_url || null;
    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
    console.time("⏱ upload avatar");
    const { error: uploadErr } = await withTimeout(
      sb.storage.from("avatars").upload(fileName, nuevaFoto, { upsert: true }),
      12000,
      "UPLOAD avatar"
    );
    console.timeEnd("⏱ upload avatar");
    if (uploadErr) {
      console.error(uploadErr);
      showSnack("Error subiendo foto");
      throw uploadErr;
    }
    const { data: pub } = sb.storage.from("avatars").getPublicUrl(fileName);
    return pub?.publicUrl || null;
  }

  // -------------------------
  // Actualizar datos básicos (nombre, teléfono, foto)
  // -------------------------
  async function actualizarDatos(nuevaFotoURL) {
    const nombre =
      (document.getElementById("nombreInput") || {}).value?.trim?.() || "";
    const telefono =
      (document.getElementById("telefonoInput") || {}).value?.trim?.() || "";

    console.time("⏱ UPDATE users");
    const { data, error } = await withTimeout(
      sb
        .from("users")
        .update({ name: nombre, phone: telefono, photo_url: nuevaFotoURL })
        .eq("id", user.id)
        .select("id,name,phone,photo_url")
        .single(),
      12000,
      "UPDATE users"
    );
    console.timeEnd("⏱ UPDATE users");

    if (error) {
      console.error("❌ UPDATE error:", error);
      showSnack(`Error UPDATE: ${error.message || error}`);
      throw error;
    }
    console.log("✅ UPDATE OK:", data);
    return {
      nombre,
      telefono,
      foto: data.photo_url || nuevaFotoURL || null,
    };
  }

  // -------------------------
  // Cambiar contraseña (si la sección está visible)
  // -------------------------
  async function cambiarPasswordSiVisible() {
    if (!bloquePassword || getComputedStyle(bloquePassword).display === "none")
      return;

    const old = oldPassword?.value?.trim?.() || "";
    const n1 = newPassword?.value?.trim?.() || "";
    const n2 = passConfirm?.value?.trim?.() || "";

    // Si no escribió nada en ningún campo → no cambiamos contraseña
    if (!old && !n1 && !n2) return;

    // Primero confirmamos que la actual es correcta
    const okActual = await validarPasswordActual(true);
    if (!okActual) {
      throw new Error("Primero confirma tu contraseña actual.");
    }

    if (!n1) throw new Error("Escribe la nueva contraseña");
    if (n1.length < 6)
      throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
    if (n1 !== n2) throw new Error("Las nuevas contraseñas no coinciden");

    console.time("⏱ UPDATE password");
    const { error } = await withTimeout(
      sb.auth.updateUser({ password: n1 }),
      12000,
      "UPDATE password"
    );
    console.timeEnd("⏱ UPDATE password");
    if (error) {
      console.error("❌ Password error:", error);
      showSnack(`Error password: ${error.message || error}`);
      throw error;
    }
    console.log("✅ Password actualizada");
  }

  // -------------------------
  // CLICK EN GUARDAR
  // -------------------------
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();
    try {
      showSnack("Guardando…");

      await probeRow();

      const fotoURL = await subirFotoSiAplica();
      const res = await actualizarDatos(fotoURL);
      await cambiarPasswordSiVisible();

      // Actualizar LS
      saveUserLS({
        ...getUserLS(),
        name: res.nombre,
        phone: res.telefono,
        photo_url: res.foto,
      });

      showSnack("Cambios guardados ✔️");
    } catch (err) {
      console.error("❌ Guardado falló:", err);
      showSnack("No se pudo guardar");
    } finally {
      stopLoading();
    }
  });

  console.log("✅ Handler de Guardar listo");
})();
