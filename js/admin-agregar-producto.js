console.log("📦 admin-agregar-producto.js — FINAL ESTABLE");

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
   CONTEXTO
============================================================ */
const params = new URLSearchParams(location.search);
let PRODUCT_ID = params.get("id");
const IS_EDIT = Boolean(PRODUCT_ID);

/* ============================================================
   ELEMENTOS
============================================================ */
const form = document.getElementById("producto-form");

const imagenInput  = document.getElementById("imagen");
const nombreInput  = document.getElementById("nombre");
const descInput    = document.getElementById("descripcion");
const categoriaSel = document.getElementById("categoria");
const tipoCafeSel  = document.getElementById("tipoCafe");
const presentacion = document.getElementById("presentacion");
const precioInput  = document.getElementById("precio");
const stockInput   = document.getElementById("stock");

const uploadBox    = document.getElementById("uploadBox");
const imagePreview = document.getElementById("imagePreview");

const btnSubmit    = document.getElementById("btn-submit");

const estadoToggle = document.getElementById("estadoToggle");
const estadoTexto  = document.getElementById("estadoTexto");

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
  }, 3000);
}

/* ============================================================
   FLOATING LABELS
============================================================ */
function syncFloatingLabels() {
  document.querySelectorAll(".m3-field").forEach(field => {
    const input = field.querySelector("input, textarea, select");
    if (!input) return;

    const update = () => {
      const hasValue =
        input.tagName === "SELECT"
          ? input.value !== ""
          : input.value.trim() !== "";

      field.classList.toggle("filled", hasValue);
    };

    update();
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });
}

/* ============================================================
   VALIDACIÓN EN CADENA
============================================================ */
function validarFormulario() {
  const campos = [
    { el: nombreInput,  msg: "El nombre es obligatorio" },
    { el: descInput,    msg: "La descripción es obligatoria" },
    { el: categoriaSel, msg: "Selecciona una categoría" },
    { el: tipoCafeSel,  msg: "Selecciona el tipo de café" },
    { el: presentacion, msg: "Selecciona la presentación" },
    { el: precioInput,  msg: "El precio debe ser mayor a 0", numeric: true },
    { el: stockInput,   msg: "Stock inválido", numeric: true }
  ];

  document.querySelectorAll(".m3-field").forEach(f => {
    f.classList.remove("error", "ok");
    const e = f.querySelector(".field-error");
    if (e) e.textContent = "";
  });

  if (!IS_EDIT && !imagenInput.files.length) {
    const field = imagenInput.closest(".m3-field");
    field.classList.add("error");
    field.querySelector(".field-error").textContent = "La imagen es obligatoria";
    return false;
  }

  for (const c of campos) {
    const value = c.el.value?.trim();
    const field = c.el.closest(".m3-field");
    const error = field.querySelector(".field-error");

    if (!value || (c.numeric && Number(value) <= 0)) {
      field.classList.add("error");
      error.textContent = c.msg;
      c.el.focus();
      return false;
    }

    field.classList.add("ok");
  }

  return true;
}

/* ============================================================
   PREVIEW IMAGEN
============================================================ */
imagenInput.addEventListener("change", () => {
  const file = imagenInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showSnackbar("Solo imágenes", "error");
    imagenInput.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showSnackbar("Máx. 2MB", "error");
    imagenInput.value = "";
    return;
  }

  imagePreview.src = URL.createObjectURL(file);
  imagePreview.classList.remove("hidden");
  uploadBox.classList.add("has-image");
});

/* ============================================================
   STORAGE — REEMPLAZAR IMAGEN
============================================================ */
async function subirImagenProductoReemplazo() {
  const file = imagenInput.files[0];
  const ext  = file.name.split(".").pop().toLowerCase();

  /* 1️⃣ eliminar imagen anterior */
  const { data: prod } = await window.supabaseClient
    .from("products")
    .select("image_url")
    .eq("id", PRODUCT_ID)
    .single();

  if (prod?.image_url) {
    let path = prod.image_url;

    if (path.startsWith("http")) {
      const url = new URL(path);
      path = url.pathname.split("/product-images/")[1];
    }

    if (path) {
      await window.supabaseClient.storage
        .from("product-images")
        .remove([path]);
    }
  }

  /* 2️⃣ subir nueva */
  const newPath = `products/${PRODUCT_ID}.${ext}`;

  await window.supabaseClient.storage
    .from("product-images")
    .upload(newPath, file, { upsert: true });

  const { data } = window.supabaseClient.storage
    .from("product-images")
    .getPublicUrl(newPath);

  return data.publicUrl;
}

/* ============================================================
   GUARDAR PRODUCTO
============================================================ */
async function guardarProducto(imageUrl = null) {
  const payload = {
    name: nombreInput.value.trim(),
    description: descInput.value.trim(),
    category: categoriaSel.value,
    grind_type: tipoCafeSel.value,
    presentation: presentacion.value.trim(),
    price: Number(precioInput.value),
    currency: "HNL",
    stock: Number(stockInput.value),
    status: estadoToggle.checked ? "activo" : "inactivo"
  };

  if (imageUrl) payload.image_url = imageUrl;

  if (IS_EDIT) {
    await window.supabaseClient
      .from("products")
      .update(payload)
      .eq("id", PRODUCT_ID);
    return;
  }

  const { data } = await window.supabaseClient
    .from("products")
    .insert(payload)
    .select("id")
    .single();

  PRODUCT_ID = data.id;

  if (imagenInput.files.length) {
    const imgUrl = await subirImagenProductoReemplazo();
    await window.supabaseClient
      .from("products")
      .update({ image_url: imgUrl })
      .eq("id", PRODUCT_ID);
  }
}

/* ============================================================
   CARGAR PRODUCTO
============================================================ */
async function cargarProducto() {
  const { data } = await window.supabaseClient
    .from("products")
    .select("*")
    .eq("id", PRODUCT_ID)
    .single();

  if (!data) return;

  nombreInput.value = data.name || "";
  descInput.value = data.description || "";
  categoriaSel.value = data.category || "";
  tipoCafeSel.value = data.grind_type || "";
  presentacion.value = data.presentation || "";
  precioInput.value = data.price ?? "";
  stockInput.value = data.stock ?? "";

  estadoToggle.checked = data.status === "activo";
  estadoTexto.textContent = estadoToggle.checked ? "Activo" : "Inactivo";

  if (data.image_url) {
    imagePreview.src = data.image_url;
    imagePreview.classList.remove("hidden");
    uploadBox.classList.add("has-image");
  }

  syncFloatingLabels();
}

/* ============================================================
   SUBMIT
============================================================ */
form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!validarFormulario()) return;

  btnSubmit.classList.add("loading");

  try {
    let imageUrl = null;

    if (IS_EDIT && imagenInput.files.length) {
      imageUrl = await subirImagenProductoReemplazo();
    }

    await guardarProducto(imageUrl);

    showSnackbar(IS_EDIT ? "Cambios guardados" : "Café agregado", "success");

    if (!IS_EDIT) {
      setTimeout(() => location.href = "admin-productos.html", 1200);
    }

  } catch (err) {
    console.error(err);
    showSnackbar("Error al guardar", "error");
  } finally {
    btnSubmit.classList.remove("loading");
  }
});

/* ============================================================
   INIT
============================================================ */
(async function init() {
  await esperarSupabase();

  if (localStorage.getItem("cortero_logged") !== "1") {
    location.href = "login.html";
    return;
  }

  if (IS_EDIT) {
    document.title = "Editar café | Café Cortero";
    await cargarProducto();
  }

  syncFloatingLabels();
})();
