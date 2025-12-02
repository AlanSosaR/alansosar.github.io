// ============================================================
// PERFIL — VERSIÓN FINAL 2025 (UI limpia, validaciones, sin duplicados)
// ============================================================
console.log("🛠 perfil.js — versión final optimizada");

// ----------------------
// Utilidades básicas
// ----------------------
function getUserLS() {
  try { return JSON.parse(localStorage.getItem("cortero_user")) || null; }
  catch { return null; }
}

function saveUserLS(data) {
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");
}

function showSnack(msg) {
  const bar = document.getElementById("snackbar");
  if (!bar) return;
  bar.querySelector(".snack-text").textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2800);
}

function labelMsg(input, msg, color) {
  const field = input.closest(".m3-field");
  if (!field) return;

  let helper = field.querySelector(".helper-text");
  if (!helper) {
    helper = document.createElement("div");
    helper.className = "helper-text";
    helper.style.fontSize = "0.75rem";
    helper.style.marginTop = "2px";
    field.appendChild(helper);
  }

  helper.textContent = msg || "";
  helper.style.color = color || "";
}

function markLabelColor(input, color) {
  const label = input.parentElement.querySelector(".floating-label");
  if (label) label.style.color = color || "";
}

// Timeout para prevenir colgados
function withTimeout(promise, ms = 12000, label = "") {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`⏳ Timeout: ${label}`)), ms)
    )
  ]);
}

// ----------------------
// Mostrar / ocultar contraseña
// ----------------------
function attachToggle(input) {
  const wrap = input.parentElement;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "showpass-btn";
  btn.style.cssText = `
    border:none;background:transparent;cursor:pointer;
    position:absolute;right:10px;top:50%;transform:translateY(-50%);
  `;
  btn.innerHTML = `<span class="material-symbols-outlined">visibility_off</span>`;
  wrap.style.position = "relative";
  wrap.appendChild(btn);

  btn.onclick = () => {
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    btn.innerHTML = `<span class="material-symbols-outlined">${isPass ? "visibility" : "visibility_off"}</span>`;
  };
}

// ----------------------
// Barra de fuerza (solo nueva contraseña)
// ----------------------
function attachStrength(input) {
  const field = input.closest(".m3-field");
  const bar = document.createElement("div");
  bar.className = "strength-bar";
  bar.style.cssText = `
    margin-top:4px;width:100%;height:4px;border-radius:99px;
    background:rgba(0,0,0,0.07);overflow:hidden;
  `;

  const fill = document.createElement("div");
  fill.style.cssText = `
    height:4px;width:0%;transition:all .25s ease;
  `;
  bar.appendChild(fill);

  const label = document.createElement("div");
  label.style.fontSize = "0.75rem";
  label.style.marginTop = "2px";

  field.appendChild(bar);
  field.appendChild(label);

  input.addEventListener("input", () => {
    const v = input.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;

    if (!v) {
      fill.style.width = "0%";
      label.textContent = "";
      return;
    }

    if (score === 1) {
      fill.style.width = "25%";
      fill.style.background = "#B3261E";
      label.textContent = "Contraseña débil";
    } else if (score <= 3) {
      fill.style.width = "60%";
      fill.style.background = "#E4A11B";
      label.textContent = "Contraseña media";
    } else {
      fill.style.width = "100%";
      fill.style.background = "#33673B";
      label.textContent = "Contraseña fuerte";
    }
  });
}

// ============================================================
// LÓGICA PRINCIPAL
// ============================================================
(function initPerfil(){
  console.log("⚙️ Cargando perfil…");

  const user = getUserLS();
  if (!user) return (window.location.href = "login.html");

  const sb = window.supabaseClient;
  if (!sb) {
    showSnack("Error Supabase");
    return;
  }

  // Campos
  const nombre = document.getElementById("nombreInput");
  const correo = document.getElementById("correoInput");
  const tel    = document.getElementById("telefonoInput");
  const foto   = document.getElementById("fotoPerfil");
  const archivo= document.getElementById("inputFoto");

  // Pintar UI
  nombre.value = user.name || "";
  correo.value = user.email || "";
  tel.value    = user.phone || "";
  foto.src     = user.photo_url || "imagenes/avatar-default.svg";

  foto.onclick = () => archivo.click();
  archivo.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    foto.src = URL.createObjectURL(file);
    window._newPhoto = file;
  };

  // -----------------------
  // Contraseñas
  // -----------------------
  const oldP = document.getElementById("oldPassword");
  const newP = document.getElementById("newPassword");
  const conf = document.getElementById("passConfirm");
  const block= document.getElementById("bloquePassword");
  const toggleBtn = document.getElementById("btnMostrarPass");

  toggleBtn.onclick = () => {
    const visible = block.style.display === "block";
    block.style.display = visible ? "none":"block";
    block.style.opacity = visible ? "0" : "1";
  };

  attachToggle(oldP);
  attachToggle(newP);
  attachToggle(conf);
  attachStrength(newP);

  let oldValid = false;

  // VALIDAR CONTRASEÑA ACTUAL
  async function validarActual() {
    const v = oldP.value.trim();
    if (!v) {
      labelMsg(oldP, "Escribe tu contraseña actual", "#B3261E");
      oldValid = false;
      return false;
    }

    labelMsg(oldP, "Verificando…", "gray");

    const { data, error } = await sb.auth.signInWithPassword({
      email: user.email,
      password: v
    });

    if (error || !data?.session) {
      labelMsg(oldP, "Contraseña incorrecta", "#B3261E");
      oldValid = false;
      return false;
    }

    labelMsg(oldP, "Contraseña actual confirmada", "#33673B");
    oldValid = true;
    return true;
  }

  oldP.addEventListener("blur", validarActual);
  oldP.addEventListener("input", () => labelMsg(oldP, "", ""));

  // VALIDACIÓN DE CONFIRMAR CONTRASEÑA
  conf.addEventListener("input", () => {
    if (!newP.value) return labelMsg(conf, "", "");

    if (conf.value === newP.value) {
      labelMsg(conf, "Coinciden ✔", "#33673B");
    } else {
      labelMsg(conf, "Las contraseñas no coinciden", "#B3261E");
    }
  });

  // ============================================================
  // GUARDAR
  // ============================================================
  const saveBtn = document.getElementById("saveBtn");
  const loader = saveBtn.querySelector(".loader");
  const btnTxt = saveBtn.querySelector(".btn-text");

  function loading(on) {
    loader.style.display = on ? "inline-block" : "none";
    loader.style.opacity = on ? "1" : "0";
    btnTxt.style.opacity = on ? "0" : "1";
    saveBtn.disabled = on;
  }

  async function subirFoto() {
    if (!window._newPhoto) return user.photo_url || null;

    const name = `avatar_${user.id}_${Date.now()}.jpg`;
    const { error } = await sb.storage.from("avatars").upload(name, window._newPhoto,{upsert:true});
    if (error) throw error;
    return sb.storage.from("avatars").getPublicUrl(name).data.publicUrl;
  }

  async function updatePassword() {
    if (block.style.display !== "block") return;

    const o = oldP.value.trim();
    const n = newP.value.trim();
    const c = conf.value.trim();

    if (!o && !n && !c) return;

    if (!(await validarActual())) throw new Error("Contraseña actual incorrecta");
    if (!n) throw new Error("Escribe la nueva contraseña");
    if (n.length < 6) throw new Error("Debe tener al menos 6 caracteres");
    if (n !== c) throw new Error("Las contraseñas no coinciden");

    const { error } = await sb.auth.updateUser({ password:n });
    if (error) throw error;
  }

  saveBtn.onclick = async () => {
    loading(true);

    try {
      const photoURL = await subirFoto();

      const { error } = await sb
        .from("users")
        .update({
          name: nombre.value.trim(),
          phone: tel.value.trim(),
          photo_url: photoURL
        })
        .eq("id", user.id);

      if (error) throw error;

      await updatePassword();

      saveUserLS({
        ...user,
        name: nombre.value.trim(),
        phone: tel.value.trim(),
        photo_url: photoURL
      });

      showSnack("Datos actualizados correctamente ✔");
    } catch (err) {
      console.error(err);
      showSnack("No se pudo guardar");
    }

    loading(false);
  };
})();
