console.log("📦 admin-agregar-producto.js — FINAL Material 3");

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
   UI — ERRORES MATERIAL 3 (MISMA LÓGICA)
============================================================ */
function mostrarError(input, mensaje) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box   = field.querySelector(".m3-input");
  const label = field.querySelector(".floating-label");

  field.classList.add("filled");

  let helper = field.querySelector(".helper-text");
  if (!helper) {
    helper = document.createElement("div");
    helper.className = "helper-text";
    field.appendChild(helper);
  }

  field.classList.add("error");
  box.classList.add("error");
  if (label) label.style.color = "#B3261E";

  helper.textContent = mensaje;
}

function limpiarError(input) {
  const field = input.closest(".m3-field");
  if (!field) return;

  const box    = field.querySelector(".m3-input");
  const label  = field.querySelector(".floating-label");
  const helper = field.querySelector(".helper-text");

  field.classList.remove("error");
  box.classList.remove("error");

  if (!input.value?.trim?.()) {
    field.classList.remove("filled");
  }

  if (label) label.style.color = "";
  if (helper) helper.textContent = "";
}

/* ============================================================
   VALIDACIÓN FINAL
============================================================ */
function validarFormulario() {
  let ok = true;

  if (!imagenInput.files.length) {
    mostrarError(imagenInput, "La imagen es obligatoria");
    ok = false;
  }

  if (!nombreInput.value.trim()) {
    mostrarError(nombreInput, "El nombre es obligatorio");
    ok = false;
  }

  if (!descInput.value.trim()) {
    mostrarError(descInput, "La descripción es obligatoria");
    ok = false;
  }

  if (!categoriaSel.value) {
    mostrarError(categoriaSel, "Selecciona una categoría");
    ok = false;
  }

  if (!presentacion.value) {
    mostrarError(presentacion, "Selecciona una presentación");
    ok = false;
  }

  if (!precioInput.value || Number(precioInput.value) <= 0) {
    mostrarError(precioInput, "Precio inválido");
    ok = false;
  }

  if (!stockInput.value || Number(stockInput.value) < 0) {
    mostrarError(stockInput, "Stock inválido");
    ok = false;
  }

  return ok;
}

/* ============================================================
   SUBIR IMAGEN A STORAGE
============================================================ */
async function subirImagenProducto() {
  const file = imagenInput.files[0];
  const ext  = file.name.split(".").pop();
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
   GUARDAR PRODUCTO EN BD
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

  if (!validarFormulario()) return;

  btnSubmit.classList.add("loading");

  try {
    const imageUrl = await subirImagenProducto();
    await guardarProducto(imageUrl);

    setTimeout(() => {
      window.location.href = "admin-k.html";
    }, 600);

  } catch (err) {
    console.error("❌ Error guardando producto", err);
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
  ].forEach(el =>
    el.addEventListener("input", () => limpiarError(el))
  );

  categoriaSel.addEventListener("change", () => {
    limpiarError(categoriaSel);
    categoriaSel.value
      ? categoriaSel.classList.add("filled")
      : categoriaSel.classList.remove("filled");
  });

  presentacion.addEventListener("change", () => {
    limpiarError(presentacion);
    presentacion.value
      ? presentacion.classList.add("filled")
      : presentacion.classList.remove("filled");
  });
})();
