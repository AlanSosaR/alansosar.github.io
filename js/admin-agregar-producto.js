console.log("📦 admin-agregar-producto.js — FINAL CORREGIDO");

/* ============================================================
   ESPERAR SUPABASE
============================================================ */
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
}

/* ============================================================
   ELEMENTOS
============================================================ */
const form = document.getElementById("producto-form");

const imagenInput   = document.getElementById("imagen");
const nombreInput   = document.getElementById("nombre");
const descInput     = document.getElementById("descripcion");
const categoriaSel  = document.getElementById("categoria");
const presentacion  = document.getElementById("presentacion");
const precioInput   = document.getElementById("precio");
const stockInput    = document.getElementById("stock");
const estadoSelect  = document.getElementById("estado");

const btnSubmit     = document.getElementById("btn-submit");

/* UPLOAD */
const uploadBox     = document.getElementById("uploadBox");
const imagePreview  = document.getElementById("imagePreview");

/* ============================================================
   SNACKBAR
============================================================ */
function showSnackbar(message, type = "success") {
  const bar = document.getElementById("snackbar");
  if (!bar) return;

  bar.textContent = message;
  bar.className = `snackbar show ${type}`;

  setTimeout(() => {
    bar.classList.remove("show", "success", "error");
  }, 3200);
}

/* ============================================================
   UI — ERRORES / OK (Material 3)
============================================================ */
function marcarError(input, mensaje) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box   = field.querySelector(".m3-input") || field;
  const label = field.querySelector(".floating-label");

  field.classList.remove("ok");
  field.classList.add("error", "filled");

  if (box) box.classList.add("error");
  if (label) label.style.color = "var(--error)";

  let helper = field.querySelector(".helper-text");
  if (!helper) {
    helper = document.createElement("div");
    helper.className = "helper-text";
    field.appendChild(helper);
  }

  helper.textContent = mensaje;
}

function marcarOk(input) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box   = field.querySelector(".m3-input") || field;
  const label = field.querySelector(".floating-label");
  const helper = field.querySelector(".helper-text");

  field.classList.remove("error");
  field.classList.add("filled", "ok");

  if (box) box.classList.remove("error");
  if (label) label.style.color = "var(--verde)";
  if (helper) helper.textContent = "";
}

/* ============================================================
   VALIDACIÓN EN CADENA (UX PREMIUM)
============================================================ */
function validarFormulario() {

  if (!imagenInput.files.length) {
    marcarError(imagenInput, "La imagen es obligatoria");
    return false;
  }
  marcarOk(imagenInput);

  if (!nombreInput.value.trim()) {
    marcarError(nombreInput, "El nombre es obligatorio");
    nombreInput.focus();
    return false;
  }
  marcarOk(nombreInput);

  if (!descInput.value.trim()) {
    marcarError(descInput, "La descripción es obligatoria");
    descInput.focus();
    return false;
  }
  marcarOk(descInput);

  if (!categoriaSel.value) {
    marcarError(categoriaSel, "Selecciona una categoría");
    categoriaSel.focus();
    return false;
  }
  marcarOk(categoriaSel);

  if (!presentacion.value) {
    marcarError(presentacion, "Selecciona una presentación");
    presentacion.focus();
    return false;
  }
  marcarOk(presentacion);

  if (!precioInput.value || Number(precioInput.value) <= 0) {
    marcarError(precioInput, "Precio inválido");
    precioInput.focus();
    return false;
  }
  marcarOk(precioInput);

  if (stockInput.value === "" || Number(stockInput.value) < 0) {
    marcarError(stockInput, "Stock inválido");
    stockInput.focus();
    return false;
  }
  marcarOk(stockInput);

  return true;
}

/* ============================================================
   PREVIEW DE IMAGEN (CORREGIDO)
============================================================ */
uploadBox.addEventListener("click", () => imagenInput.click());

imagenInput.addEventListener("change", () => {
  const file = imagenInput.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showSnackbar("La imagen no puede superar 2 MB", "error");
    imagenInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    imagePreview.classList.remove("hidden");
    uploadBox.classList.add("has-image");
    marcarOk(imagenInput);
  };
  reader.readAsDataURL(file);
});

/* ============================================================
   STORAGE — SUBIR IMAGEN
============================================================ */
async function subirImagenProducto() {
  const file = imagenInput.files[0];
  const ext  = file.name.split(".").pop().toLowerCase();
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const { error } = await window.supabaseClient.storage
    .from("product-images")
    .upload(path, file, {
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  const { data } = window.supabaseClient.storage
    .from("product-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

/* ============================================================
   GUARDAR PRODUCTO
============================================================ */
async function guardarProducto(imageUrl) {
  const { error } = await window.supabaseClient
    .from("products")
    .insert({
      name: nombreInput.value.trim(),
      description: descInput.value.trim(),
      category: categoriaSel.value,
      price: Number(precioInput.value),
      currency: "HNL",
      stock: Number(stockInput.value),
      image_url: imageUrl,
      status: estadoSelect?.value || "activo"
    });

  if (error) throw error;
}

/* ============================================================
   SUBMIT
============================================================ */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!validarFormulario()) return;

  btnSubmit.classList.add("loading");

  try {
    const imageUrl = await subirImagenProducto();
    await guardarProducto(imageUrl);

    showSnackbar("✅ Producto agregado correctamente", "success");

    setTimeout(() => {
      window.location.href = "admin-productos.html";
    }, 1200);

  } catch (err) {
    console.error("❌ Error guardando producto", err);
    showSnackbar("❌ Error al guardar el producto", "error");
    btnSubmit.classList.remove("loading");
  }
});

/* ============================================================
   INIT
============================================================ */
(async function init() {
  await esperarSupabase();

  if (localStorage.getItem("cortero_logged") !== "1") {
    window.location.href = "login.html";
    return;
  }

  [nombreInput, descInput, precioInput, stockInput].forEach(el => {
    el.addEventListener("input", () => {
      el.value.trim() ? marcarOk(el) : null;
    });
  });

  categoriaSel.addEventListener("change", () => {
    categoriaSel.value && marcarOk(categoriaSel);
  });

  presentacion.addEventListener("change", () => {
    presentacion.value && marcarOk(presentacion);
  });
})();
