// ============================================================
// PERFIL — HOTFIX con sondeo, logs y timeout anti-colgado
// ============================================================
console.log("🛠 perfil.js — HOTFIX depuración/timeout");

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

// Utilidad: timeout para promesas (evita loader infinito)
function withTimeout(promise, ms = 12000, label = "operación") {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`⏳ Timeout (${label}) después de ${ms}ms`)), ms)
    ),
  ]);
}

(function initPerfil() {
  console.log("⚙️ Iniciando pantalla de perfil…");
  const user = getUserLS();
  if (!user) { window.location.href = "login.html"; return; }
  paintProfile(user);

  const sb = window.supabaseClient;
  if (!sb) { console.error("❌ Supabase no inicializado"); showSnack("Error Supabase"); return; }

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

  if (!saveBtn) { console.error("❌ Falta #saveBtn"); return; }

  let nuevaFoto = null;

  if (fotoPerfil && fotoInput) {
    fotoPerfil.onclick = () => fotoInput.click();
    fotoInput.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      nuevaFoto = file; fotoPerfil.src = URL.createObjectURL(file);
      console.log("📸 Nueva foto seleccionada");
    };
  }

  if (btnMostrarPass && bloquePassword) {
    btnMostrarPass.onclick = () => {
      const visible = getComputedStyle(bloquePassword).display !== "none";
      bloquePassword.style.display = visible ? "none" : "block";
      bloquePassword.style.opacity = visible ? "0" : "1";
    };
  }

  function startLoading(){ if (loader){loader.style.display="inline-block";loader.style.opacity="1";} if (btnText) btnText.style.opacity="0"; saveBtn.disabled=true; }
  function stopLoading(){ if (loader){loader.style.display="none";loader.style.opacity="0";} if (btnText) btnText.style.opacity="1"; saveBtn.disabled=false; }

  // --- Sonda rápida: ¿existe tu fila en users?
  async function probeRow() {
    console.time("⏱ probe SELECT");
    const { data, error } = await withTimeout(
      sb.from("users").select("id").eq("id", user.id).maybeSingle(),
      12000, "SELECT de sondeo"
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

  async function subirFotoSiAplica() {
    if (!nuevaFoto) return user.photo_url || null;
    const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
    console.time("⏱ upload avatar");
    const { error: uploadErr } = await withTimeout(
      sb.storage.from("avatars").upload(fileName, nuevaFoto, { upsert: true }),
      12000, "UPLOAD avatar"
    );
    console.timeEnd("⏱ upload avatar");
    if (uploadErr) { console.error(uploadErr); showSnack("Error subiendo foto"); throw uploadErr; }
    const { data: pub } = sb.storage.from("avatars").getPublicUrl(fileName);
    return pub?.publicUrl || null;
  }

  async function actualizarDatos(nuevaFotoURL) {
    const nombre   = (document.getElementById("nombreInput")   || {}).value?.trim?.() || "";
    const telefono = (document.getElementById("telefonoInput") || {}).value?.trim?.() || "";

    console.time("⏱ UPDATE users");
    const { data, error } = await withTimeout(
      sb.from("users")
        .update({ name: nombre, phone: telefono, photo_url: nuevaFotoURL })
        .eq("id", user.id)
        .select("id,name,phone,photo_url")
        .single(),
      12000, "UPDATE users"
    );
    console.timeEnd("⏱ UPDATE users");

    if (error) { console.error("❌ UPDATE error:", error); showSnack(`Error UPDATE: ${error.message||error}`); throw error; }
    console.log("✅ UPDATE OK:", data);
    return { nombre, telefono, foto: data.photo_url || nuevaFotoURL || null };
  }

  async function cambiarPasswordSiVisible() {
    if (!bloquePassword || getComputedStyle(bloquePassword).display === "none") return;
    const old = oldPassword?.value?.trim?.() || "";
    const n1  = newPassword?.value?.trim?.() || "";
    const n2  = passConfirm?.value?.trim?.() || "";
    if (!old && !n1 && !n2) return;

    if (!old) throw new Error("Debes escribir tu contraseña actual");
    if (n1.length < 6) throw new Error("Contraseña mínima 6 caracteres");
    if (n1 !== n2) throw new Error("Las contraseñas no coinciden");

    console.time("⏱ UPDATE password");
    const { error } = await withTimeout(
      sb.auth.updateUser({ password: n1 }),
      12000, "UPDATE password"
    );
    console.timeEnd("⏱ UPDATE password");
    if (error) { console.error("❌ Password error:", error); showSnack(`Error password: ${error.message||error}`); throw error; }
    console.log("✅ Password actualizada");
  }

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    startLoading();
    try {
      showSnack("Guardando…");
      await probeRow();

      const fotoURL = await subirFotoSiAplica();
      const res     = await actualizarDatos(fotoURL);
      await cambiarPasswordSiVisible();

      // Actualizar LS
      saveUserLS({ ...getUserLS(), name: res.nombre, phone: res.telefono, photo_url: res.foto });
      showSnack("Cambios guardados ✔️");
    } catch (err) {
      console.error("❌ Guardado falló:", err);
      // El snackbar ya mostró un mensaje específico; reforzamos uno genérico:
      showSnack("No se pudo guardar");
    } finally {
      stopLoading();
    }
  });

  console.log("✅ Handler de Guardar listo");
})();
