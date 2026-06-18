console.log("⚙️ admin-configuracion.js");

/* ============================================================
   ESPERAR SUPABASE
   ============================================================ */
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) { clearInterval(i); resolve(); }
    }, 80);
  });
}

/* ============================================================
   ELEMENTOS
   ============================================================ */
const form = document.getElementById("configForm");
const slidesContainer = document.getElementById("slides-container");
const btnAddSlide = document.getElementById("btnAddSlide");
const slideUploadInput = document.getElementById("slideUploadInput");

const historiaTitulo = document.getElementById("historia_titulo");
const historiaSubtitulo = document.getElementById("historia_subtitulo");
const historiaLead = document.getElementById("historia_lead");
const historiaBody = document.getElementById("historia_body");
const historiaPreview = document.getElementById("historiaPreview");
const historiaImgUpload = document.getElementById("historiaImgUpload");
const historiaImgInput = document.getElementById("historiaImgInput");

const whatsappNumero = document.getElementById("whatsapp_numero");
const whatsappNumero2 = document.getElementById("whatsapp_numero2");
const facebookUrl = document.getElementById("facebook_url");
const instagramUrl = document.getElementById("instagram_url");
const btnSave = document.getElementById("btnSaveConfig");

// Logo y footer
const logoInput = document.getElementById("logoInput");
const logoPreview = document.getElementById("logoPreview");
const btnUploadLogo = document.getElementById("btnUploadLogo");
const btnRestoreLogo = document.getElementById("btnRestoreLogo");
const logoInputSec = document.getElementById("logoInputSec");
const logoSecPreview = document.getElementById("logoSecPreview");
const btnUploadLogoSec = document.getElementById("btnUploadLogoSec");
const btnRestoreLogoSec = document.getElementById("btnRestoreLogoSec");
const footerTextInput = document.getElementById("footerTextInput");

let logoBlob = null;
let logoSecBlob = null;

const BUCKET = "site-assets";
const STORAGE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co/storage/v1/object/public";

let slides = [];
let historiaImagenBlob = null;
let pendingSlideUploads = []; // índices de slides con nuevas imágenes por subir

/* ============================================================
   COMPRIMIR IMAGEN (max 1920px, WebP/JPEG)
   ============================================================ */
function comprimirImagen(file, maxWidth = 1920, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = h * maxWidth / w; w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob), "image/webp", quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ============================================================
   SUBIR ARCHIVO AL BUCKET
   ============================================================ */
async function subirArchivo(blob, fileName) {
  const { data, error } = await window.supabaseClient
    .storage
    .from(BUCKET)
    .upload(fileName, blob, { upsert: true, contentType: "image/webp" });
  if (error) throw error;
  return `${STORAGE_URL}/${BUCKET}/${fileName}`;
}

/* ============================================================
   GENERAR NOMBRE ÚNICO
   ============================================================ */
function generarNombre() {
  return `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
}

/* ============================================================
   RENDERIZAR SLIDES
   ============================================================ */
function renderSlides() {
  slidesContainer.innerHTML = "";
  slides.forEach((slide, i) => {
    const div = document.createElement("div");
    div.className = "slide-item";

    const imgSrc = slide._blob
      ? URL.createObjectURL(slide._blob)
      : slide.url || "/imagenes/no-image.png";

    div.innerHTML = `
      <img class="slide-thumb" src="${imgSrc}" alt="Slide ${i + 1}">
      <div class="slide-fields">
        <div class="slide-fields-row">
          <input type="text" class="slide-title-input" placeholder="Título (opcional)" value="${escapeHtml(slide.titulo || "")}">
          <input type="text" class="slide-subtitle-input" placeholder="Subtítulo (opcional)" value="${escapeHtml(slide.subtitulo || "")}">
        </div>
      </div>
      <div class="slide-actions">
        <button type="button" class="slide-btn move-up" title="Subir" ${i === 0 ? "disabled style='opacity:.3'" : ""}>
          <span class="material-symbols-outlined">keyboard_arrow_up</span>
        </button>
        <button type="button" class="slide-btn move-down" title="Bajar" ${i === slides.length - 1 ? "disabled style='opacity:.3'" : ""}>
          <span class="material-symbols-outlined">keyboard_arrow_down</span>
        </button>
        <button type="button" class="slide-btn delete" title="Eliminar">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;

    const titleInput = div.querySelector(".slide-title-input");
    const subtitleInput = div.querySelector(".slide-subtitle-input");

    titleInput.addEventListener("input", () => { slide.titulo = titleInput.value; });
    subtitleInput.addEventListener("input", () => { slide.subtitulo = subtitleInput.value; });

    div.querySelector(".move-up").addEventListener("click", () => {
      if (i > 0) {
        [slides[i - 1], slides[i]] = [slides[i], slides[i - 1]];
        renderSlides();
      }
    });

    div.querySelector(".move-down").addEventListener("click", () => {
      if (i < slides.length - 1) {
        [slides[i], slides[i + 1]] = [slides[i + 1], slides[i]];
        renderSlides();
      }
    });

    div.querySelector(".delete").addEventListener("click", () => {
      slides.splice(i, 1);
      renderSlides();
    });

    // Click en thumbnail para reemplazar imagen
    const thumb = div.querySelector(".slide-thumb");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/jpeg,image/png,image/webp";
    fileInput.hidden = true;
    div.appendChild(fileInput);
    thumb.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const blob = await comprimirImagen(file);
      slide._blob = blob;
      slide._dirty = true;
      renderSlides();
    });

    slidesContainer.appendChild(div);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/* ============================================================
   CARGAR CONFIGURACIÓN DESDE SUPABASE
   ============================================================ */
async function cargarConfiguracion() {
  const { data, error } = await window.supabaseClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    console.warn("⚠️ No se pudo cargar site_settings, usando defaults");
    slides = [
      { url: "/imagenes/origen1.jpg", orden: 0, titulo: "La esencia de Honduras en cada sorbo", subtitulo: "Café de altura cultivado a 1100 msnm, fresco y directo de la finca." },
      { url: "/imagenes/origen2.jpg", orden: 1, titulo: "", subtitulo: "" },
      { url: "/imagenes/origen3.jpg", orden: 2, titulo: "", subtitulo: "" },
      { url: "/imagenes/cosecha1.jpg", orden: 3, titulo: "", subtitulo: "" },
      { url: "/imagenes/cosecha2.jpg", orden: 4, titulo: "", subtitulo: "" },
      { url: "/imagenes/cosecha3.jpg", orden: 5, titulo: "", subtitulo: "" },
      { url: "/imagenes/cosecha4.jpg", orden: 6, titulo: "", subtitulo: "" },
      { url: "/imagenes/cosecha5.jpg", orden: 7, titulo: "", subtitulo: "" },
      { url: "/imagenes/tostado1.jpg", orden: 8, titulo: "", subtitulo: "" },
      { url: "/imagenes/tostado2.jpg", orden: 9, titulo: "", subtitulo: "" },
      { url: "/imagenes/tostado3.jpg", orden: 10, titulo: "", subtitulo: "" },
      { url: "/imagenes/tostado4.jpg", orden: 11, titulo: "", subtitulo: "" }
    ];
    historiaTitulo.value = "Nuestra historia";
    historiaSubtitulo.value = "Sobre Café Cortero";
    historiaLead.value = "Café Cortero es un proyecto familiar nacido del amor por la tierra y el café bien hecho. Cada grano refleja nuestro compromiso con la calidad, el respeto al entorno y el orgullo de producir café hondureño.";
    historiaBody.value = "Desde la siembra hasta el tostado, cuidamos cada etapa de forma artesanal, combinando tradición, dedicación y experiencia para que disfrutes en cada taza un café honesto y lleno de sabor.";
    historiaPreview.src = "/imagenes/nosotros.jpg";
    whatsappNumero.value = "50496670613";
    whatsappNumero2.value = "50498675101";
    facebookUrl.value = "https://www.facebook.com/share/1FsrT4DYrU/";
    instagramUrl.value = "https://www.instagram.com/TU_USUARIO";
    logoPreview.src = "/imagenes/logo.png";
    logoSecPreview.src = "/imagenes/logo_secundario.png";
    footerTextInput.value = "2026 Café Cortero. Todos los derechos reservados.";
    renderSlides();
    return;
  }

  historiaTitulo.value = data.historia_titulo || "";
  historiaSubtitulo.value = data.historia_subtitulo || "";
  historiaLead.value = data.historia_lead || "";
  historiaBody.value = data.historia_body || "";
  historiaPreview.src = data.historia_imagen_url || "/imagenes/nosotros.jpg";
  whatsappNumero.value = data.whatsapp_numero || "";
  whatsappNumero2.value = data.whatsapp_numero2 || "";
  facebookUrl.value = data.facebook_url || "";
  instagramUrl.value = data.instagram_url || "";
  logoPreview.src = data.logo_url || "/imagenes/logo.png";
  logoSecPreview.src = data.logo_secundario_url || "/imagenes/logo_secundario.png";
  footerTextInput.value = data.footer_text || "2026 Café Cortero. Todos los derechos reservados.";

  slides = (data.hero_slides || []).map(s => ({ ...s }));
  renderSlides();
}

/* ============================================================
   GUARDAR CONFIGURACIÓN (UPSERT)
   ============================================================ */
async function guardarConfiguracion(e) {
  e.preventDefault();
  btnSave.classList.add("loading");
  btnSave.textContent = "Guardando...";

  try {
    // 1. Subir imágenes pendientes de slides
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (slide._blob) {
        const fileName = generarNombre();
        const url = await subirArchivo(slide._blob, fileName);
        slide.url = url;
        delete slide._blob;
        delete slide._dirty;
      }
    }

    // 2. Subir imagen de historia si cambió
    let historiaImagenUrl = historiaPreview.src;
    if (historiaImagenBlob) {
      const fileName = `historia_${Date.now()}.webp`;
      historiaImagenUrl = await subirArchivo(historiaImagenBlob, fileName);
      historiaPreview.src = historiaImagenUrl;
      historiaImagenBlob = null;
    }

    // 2b. Subir logo principal si cambió
    let logoUrl = logoPreview.src;
    if (logoBlob) {
      const fileName = `logo_${Date.now()}.webp`;
      logoUrl = await subirArchivo(logoBlob, fileName);
      logoPreview.src = logoUrl;
      logoBlob = null;
    }

    // 2c. Subir logo secundario si cambió
    let logoSecUrl = logoSecPreview.src;
    if (logoSecBlob) {
      const fileName = `logo_sec_${Date.now()}.webp`;
      logoSecUrl = await subirArchivo(logoSecBlob, fileName);
      logoSecPreview.src = logoSecUrl;
      logoSecBlob = null;
    }

    // 3. Construir payload
    const payload = {
      id: 1,
      hero_slides: slides.map((s, i) => ({
        url: s.url,
        orden: i,
        titulo: s.titulo || "",
        subtitulo: s.subtitulo || ""
      })),
      historia_titulo: historiaTitulo.value.trim(),
      historia_subtitulo: historiaSubtitulo.value.trim(),
      historia_lead: historiaLead.value.trim(),
      historia_body: historiaBody.value.trim(),
      historia_imagen_url: historiaImagenUrl,
      whatsapp_numero: whatsappNumero.value.trim(),
      whatsapp_numero2: whatsappNumero2.value.trim(),
      facebook_url: facebookUrl.value.trim(),
      instagram_url: instagramUrl.value.trim(),
      logo_url: logoUrl,
      logo_secundario_url: logoSecUrl,
      footer_text: footerTextInput.value.trim(),
      updated_at: new Date().toISOString()
    };

    // 4. Upsert (inserta si no existe, actualiza si ya existe)
    const { error } = await window.supabaseClient
      .from("site_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    showSnackbar("✅ Configuración guardada correctamente", "success");
  } catch (err) {
    console.error("❌ Error al guardar:", err);
    showSnackbar("❌ Error al guardar la configuración", "error");
  } finally {
    btnSave.classList.remove("loading");
    btnSave.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar cambios';
  }
}

/* ============================================================
   AGREGAR SLIDE
   ============================================================ */
btnAddSlide.addEventListener("click", () => slideUploadInput.click());

slideUploadInput.addEventListener("change", async () => {
  const files = Array.from(slideUploadInput.files);
  if (!files.length) return;
  for (const file of files) {
    const blob = await comprimirImagen(file);
    slides.push({
      url: URL.createObjectURL(blob),
      orden: slides.length,
      titulo: "",
      subtitulo: "",
      _blob: blob,
      _dirty: true
    });
  }
  slideUploadInput.value = "";
  renderSlides();
});

/* ============================================================
   SUBIR IMAGEN DE HISTORIA
   ============================================================ */
historiaImgUpload.addEventListener("click", () => historiaImgInput.click());

historiaImgInput.addEventListener("change", async () => {
  const file = historiaImgInput.files[0];
  if (!file) return;
  historiaImagenBlob = await comprimirImagen(file);
  historiaPreview.src = URL.createObjectURL(historiaImagenBlob);
});

/* ============================================================
   SNACKBAR
   ============================================================ */
function showSnackbar(message, type = "success") {
  const el = document.getElementById("snackbar");
  if (!el) return;
  el.textContent = message;
  el.className = "snackbar show";
  if (type) el.classList.add(type);
  setTimeout(() => el.classList.remove("show", "success", "error", "warn"), 3500);
}

/* ============================================================
   LOGO UPLOAD / RESTORE
   ============================================================ */
function setupLogoUpload(btn, input, preview, blobVarSetter) {
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const blob = await comprimirImagen(file);
    blobVarSetter(blob);
    preview.src = URL.createObjectURL(blob);
  });
}

setupLogoUpload(btnUploadLogo, logoInput, logoPreview, b => { logoBlob = b; });
setupLogoUpload(btnUploadLogoSec, logoInputSec, logoSecPreview, b => { logoSecBlob = b; });

btnRestoreLogo.addEventListener("click", () => {
  logoBlob = null;
  logoPreview.src = "/imagenes/logo.png";
});

btnRestoreLogoSec.addEventListener("click", () => {
  logoSecBlob = null;
  logoSecPreview.src = "/imagenes/logo_secundario.png";
});

/* ============================================================
   INIT
   ============================================================ */
(async function init() {
  await esperarSupabase();

  if (localStorage.getItem("cortero_logged") !== "1") {
    location.href = "/pages/auth/login.html";
    return;
  }

  try {
    const user = JSON.parse(localStorage.getItem("cortero_user"));
    if (user?.rol !== "admin") {
      location.href = "/pages/home/index.html";
      return;
    }
  } catch { location.href = "/pages/auth/login.html"; return; }

  form.addEventListener("submit", guardarConfiguracion);

  await cargarConfiguracion();
})();
