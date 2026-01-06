console.log("📦 admin-agregar-producto.js — FINAL DEFINITIVO");

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
   CONTEXTO (AGREGAR / EDITAR)
============================================================ */
const params = new URLSearchParams(location.search);
const PRODUCT_ID = params.get("id");
const IS_EDIT = Boolean(PRODUCT_ID);

/* ============================================================
   ELEMENTOS
============================================================ */
const form = document.getElementById("producto-form");

const imagenInput   = document.getElementById("imagen");
const nombreInput   = document.getElementById("nombre");
const descInput     = document.getElementById("descripcion");
const categoriaSel  = document.getElementById("categoria");
const tipoCafeSel   = document.getElementById("tipoCafe");
const presentacion  = document.getElementById("presentacion");
const precioInput   = document.getElementById("precio");
const stockInput    = document.getElementById("stock");

const uploadBox     = document.getElementById("uploadBox");
const imagePreview  = document.getElementById("imagePreview");

const btnSubmit     = document.getElementById("btn-submit");

const estadoToggle  = document.getElementById("estadoToggle");
const estadoTexto   = document.getElementById("estadoTexto");

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

/* =====================================================
   FLOATING LABEL — FIX GLOBAL
===================================================== */
function syncFloatingLabels() {
  document.querySelectorAll(".m3-field").forEach(field => {
    const control = field.querySelector("input, textarea, select");
    if (!control) return;

    const update = () => {
      const hasValue =
        control.tagName === "SELECT"
          ? control.value !== ""
          : control.value.trim() !== "";

      field.classList.toggle("filled", hasValue);
    };

    update();
    control.addEventListener("input", update);
    control.addEventListener("change", update);
    control.addEventListener("blur", update);
  });
}

/* ============================================================
   VALIDACIÓN
============================================================ */
function validarFormulario() {
  let valido = true;

  // limpiar estados previos
  document.querySelectorAll(".m3-field").forEach(field => {
    field.classList.remove("error", "ok");
    const err = field.querySelector(".field-error");
    if (err) err.textContent = "";
  });

  const validar = (input, mensaje) => {
    const field = input.closest(".m3-field");
    const error = field.querySelector(".field-error");

    if (!input.value || input.value.trim() === "") {
      field.classList.add("error");
      error.textContent = mensaje;
      valido = false;
    } else {
      field.classList.add("ok");
    }
  };

  const validarNumero = (input, mensaje) => {
    const field = input.closest(".m3-field");
    const error = field.querySelector(".field-error");

    if (input.value === "" || Number(input.value) < 0) {
      field.classList.add("error");
      error.textContent = mensaje;
      valido = false;
    } else {
      field.classList.add("ok");
    }
  };

// imagen obligatoria SOLO al crear
if (!IS_EDIT && !imagenInput.files.length) {
  const field = imagenInput.closest(".m3-field");
  const error = field?.querySelector(".field-error");

  if (field) field.classList.add("error");
  if (error) error.textContent = "La imagen es obligatoria";

  return false;
}

  // validación en cadena
  validar(nombreInput, "El nombre es obligatorio");
  validar(descInput, "La descripción es obligatoria");
  validar(categoriaSel, "Selecciona una categoría");
  validar(tipoCafeSel, "Selecciona el tipo de café");
  validar(presentacion, "Selecciona la presentación");

  validarNumero(precioInput, "El precio debe ser mayor a 0");
  validarNumero(stockInput, "Stock inválido");

  return valido;
}

/* ============================================================
   IMAGEN — PREVIEW
============================================================ */
imagenInput.addEventListener("change", () => {
  if (!imagenInput.files.length) return;

  const file = imagenInput.files[0];

  if (!file.type.startsWith("image/")) {
    showSnackbar("Solo se permiten imágenes", "error");
    imagenInput.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showSnackbar("Máx. 2 MB", "error");
    imagenInput.value = "";
    return;
  }

  imagePreview.src = URL.createObjectURL(file);
  imagePreview.classList.remove("hidden");
  uploadBox.classList.add("has-image");
});

/* ============================================================
   STORAGE — SUBIR IMAGEN
============================================================ */
async function subirImagenProducto() {
  if (!imagenInput.files.length) return null;

  const file = imagenInput.files[0];
  const ext  = file.name.split(".").pop();
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const { error } = await window.supabaseClient.storage
    .from("product-images")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = window.supabaseClient.storage
    .from("product-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

/* ============================================================
   GUARDAR / ACTUALIZAR
============================================================ */
async function guardarProducto(imageUrl) {
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

  // ✅ UPDATE
  if (IS_EDIT) {
    const { data, error } = await window.supabaseClient
      .from("products")
      .update(payload)
      .eq("id", PRODUCT_ID)
      .select("id")         // 🔑 confirma que actualizó
      .single();

    if (error) {
      console.error("❌ Error UPDATE products:", error);
      throw error;
    }

    return data?.id;
  }

  // ✅ INSERT
  const { data, error } = await window.supabaseClient
    .from("products")
    .insert(payload)
    .select("id")          // 🔑 te devuelve el id nuevo
    .single();

  if (error) {
    console.error("❌ Error INSERT products:", error);
    throw error;
  }

  return data?.id;
}

/* ============================================================
   CARGAR PRODUCTO (EDITAR)
============================================================ */
async function cargarProducto() {
  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .eq("id", PRODUCT_ID)
    .single();

  if (error || !data) return;

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

  syncFloatingLabels(); // 🔑 CLAVE
}

/* ============================================================
   SUBMIT
============================================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validarFormulario()) return;

  btnSubmit.classList.add("loading");

  try {
    let imageUrl = null;

    if (imagenInput.files.length) {
      imageUrl = await subirImagenProducto();
    }

    await guardarProducto(imageUrl);

    showSnackbar(
      IS_EDIT
        ? "✅ Cambios actualizados correctamente"
        : "✅ Café agregado correctamente",
      "success"
    );

    // 👉 SOLO REDIRIGE AL CREAR
    if (!IS_EDIT) {
      setTimeout(() => {
        location.href = "admin-productos.html";
      }, 1200);
    }

  } catch (err) {
    console.error("❌ Error guardando producto:", err);
    showSnackbar("❌ Error al guardar el café", "error");
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

  // 🔑 TEXTO DEL BOTÓN SEGÚN CONTEXTO
  const btnText = btnSubmit.querySelector(".btn-text");

  if (IS_EDIT) {
    btnText.textContent = "Actualizar café";
    document.title = "Editar café | Café Cortero";
    await cargarProducto();
  } else {
    btnText.textContent = "Guardar café";
    document.title = "Agregar café | Café Cortero";
  }

  // 🔑 CLAVE: sincronizar labels AL FINAL
  syncFloatingLabels();
})();
