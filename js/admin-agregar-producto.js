console.log("📦 admin-agregar-producto.js — FINAL VALIDADO");

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
   CAMPOS
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

const btnSubmit = document.getElementById("btn-submit");

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
   UI — ERRORES MATERIAL 3
============================================================ */
function marcarError(input, mensaje) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box = field.querySelector(".m3-input");
  const label = field.querySelector(".floating-label");

  field.classList.add("error", "filled");
  box.classList.add("error");
  if (label) label.style.color = "#B3261E";

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

  const box = field.querySelector(".m3-input");
  const label = field.querySelector(".floating-label");
  const helper = field.querySelector(".helper-text");

  field.classList.remove("error");
  box.classList.remove("error");

  field.classList.add("filled", "ok");
  if (label) label.style.color = "var(--verde)";
  if (helper) helper.textContent = "";
}

/* ============================================================
   VALIDACIÓN EN CADENA (CLAVE)
============================================================ */
function validarFormularioEnCadena() {

  // 1️⃣ IMAGEN
  if (!imagenInput.files.length) {
    marcarError(imagenInput, "La imagen es obligatoria");
    imagenInput.focus();
    return false;
  } else marcarOk(imagenInput);

  // 2️⃣ NOMBRE
  if (!nombreInput.value.trim()) {
    marcarError(nombreInput, "El nombre es obligatorio");
    nombreInput.focus();
    return false;
  } else marcarOk(nombreInput);

  // 3️⃣ DESCRIPCIÓN
  if (!descInput.value.trim()) {
    marcarError(descInput, "La descripción es obligatoria");
    descInput.focus();
    return false;
  } else marcarOk(descInput);

  // 4️⃣ CATEGORÍA
  if (!categoriaSel.value) {
    marcarError(categoriaSel, "Selecciona una categoría");
    categoriaSel.focus();
    return false;
  } else marcarOk(categoriaSel);

  // 5️⃣ PRESENTACIÓN
  if (!presentacion.value) {
    marcarError(presentacion, "Selecciona una presentación");
    presentacion.focus();
    return false;
  } else marcarOk(presentacion);

  // 6️⃣ PRECIO
  if (!precioInput.value || Number(precioInput.value) <= 0) {
    marcarError(precioInput, "Precio inválido");
    precioInput.focus();
    return false;
  } else marcarOk(precioInput);

  // 7️⃣ STOCK
  if (stockInput.value === "" || Number(stockInput.value) < 0) {
    marcarError(stockInput, "Stock inválido");
    stockInput.focus();
    return false;
  } else marcarOk(stockInput);

  return true;
}

/* ============================================================
   STORAGE — SUBIR IMAGEN
============================================================ */
async function subirImagenProducto() {
  const file = imagenInput.files[0];
  const ext = file.name.split(".").pop();
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const { error } = await window.supabaseClient.storage
    .from("product-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false
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
      image_url: imageUrl
    });

  if (error) throw error;
}

/* ============================================================
   SUBMIT
============================================================ */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!validarFormularioEnCadena()) return;

  btnSubmit.classList.add("loading");

  try {
    const imageUrl = await subirImagenProducto();
    await guardarProducto(imageUrl);

    showSnackbar("✅ Producto agregado correctamente", "success");

    setTimeout(() => {
      window.location.href = "admin-productos.html";
    }, 1200);

  } catch (err) {
    console.error("❌ Error al guardar producto", err);
    showSnackbar("❌ No se pudo guardar el producto", "error");
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

  [
    nombreInput,
    descInput,
    precioInput,
    stockInput
  ].forEach(el => {
    el.addEventListener("input", () => {
      if (el.value.trim()) marcarOk(el);
    });
  });

  categoriaSel.addEventListener("change", () => {
    categoriaSel.value ? marcarOk(categoriaSel) : null;
  });

  presentacion.addEventListener("change", () => {
    presentacion.value ? marcarOk(presentacion) : null;
  });

})();
