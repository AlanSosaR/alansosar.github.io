console.log("⚙️ admin-configuracion.js");

/* ============================================================
   LIMPIAR URL LOCALHOST (datos corruptos)
   ============================================================ */
function urlValida(url) {
  if (!url) return "";
  if (/localhost|127\.0\.0\.1/.test(url)) return "";
  return url;
}

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
// Conserva los controles originales y sus eventos dentro del campo delineado.
form.querySelectorAll("input.config-input, textarea.config-input").forEach(control => {
  const label = form.querySelector(`label[for="${control.id}"]`);
  if (!label) return;
  const field = document.createElement("div");
  field.className = "slide-text-field config-material-field";
  control.before(field);
  field.append(control, label);
});
const slidesContainer = document.getElementById("slides-container");
const btnAddSlide = document.getElementById("btnAddSlide");
const slideUploadInput = document.getElementById("slideUploadInput");

const historiaTitulo = document.getElementById("historia_titulo");
const historiaSubtitulo = document.getElementById("historia_subtitulo");
const historiaLead = document.getElementById("historia_lead");
const historiaBody = document.getElementById("historia_body");
function ajustarTextoHistoria() {
  document.querySelectorAll("textarea.config-textarea").forEach(field => {
    if (!field || !field.getClientRects().length) return;
    field.style.height = "auto";
    const border = field.offsetHeight - field.clientHeight;
    field.style.height = `${field.scrollHeight + border}px`;
    field.style.overflowY = "hidden";
  });
}
document.querySelectorAll("textarea.config-textarea").forEach(field => field.addEventListener("input", ajustarTextoHistoria));
window.addEventListener("resize", ajustarTextoHistoria);
const historiaPreview = document.getElementById("historiaPreview");
const historiaImgUpload = document.getElementById("historiaImgUpload");
const historiaImgInput = document.getElementById("historiaImgInput");

const whatsappNumero = document.getElementById("whatsapp_numero");
const whatsappNumero2 = document.getElementById("whatsapp_numero2");
const facebookUrl = document.getElementById("facebook_url");
const instagramUrl = document.getElementById("instagram_url");


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

// Reseñas
const reviewsAdminList = document.getElementById("reviewsAdminList");

let logoBlob = null;
let logoSecBlob = null;
let originalLogoUrl = "";
let originalLogoSecUrl = "";
let originalHistoriaImgUrl = "";

// Páginas legales
const privacyEditor = document.getElementById("privacyEditor");
const termsEditor = document.getElementById("termsEditor");

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
    div.draggable = true;
    div.tabIndex = 0;
    div.setAttribute("role", "button");
    div.setAttribute("aria-label", `Editar imagen ${i + 1}`);

    div.innerHTML = `<img class="slide-thumb" src="${slideImgSrc(slide)}" alt="Slide ${i + 1}" draggable="false">`;

    // Click en la imagen: abre el side sheet de edición
    div._slide = slide;
    let holdTimer, draggingTouch = false, startX = 0, startY = 0;
    let suppressClickUntil = 0;
    const finishTouch = (cancelled = false) => {
      clearTimeout(holdTimer);
      if (!draggingTouch) return;
      draggingTouch = false;
      suppressClickUntil = Date.now() + 700;
      slidesContainer.dataset.suppressClickUntil = suppressClickUntil;
      div.classList.remove("touch-reordering");
      if (!cancelled) {
        slides = Array.from(slidesContainer.children).map(item => item._slide);
      }
      renderSlides();
    };
    div.addEventListener("touchstart", e => {
      if (e.touches.length !== 1) { finishTouch(true); return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      holdTimer = setTimeout(() => {
        draggingTouch = true;
        suppressClickUntil = Date.now() + 60000;
        div.classList.add("touch-reordering");
      }, 400);
    }, { passive: true });
    div.addEventListener("touchmove", e => {
      if (e.touches.length !== 1) { finishTouch(true); return; }
      const touch = e.touches[0];
      if (!draggingTouch) {
        if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 8) clearTimeout(holdTimer);
        return;
      }
      if (e.cancelable) e.preventDefault();
      const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".slide-item");
      if (!target || target === div || target.parentElement !== slidesContainer) return;
      const items = Array.from(slidesContainer.children);
      if (items.indexOf(div) < items.indexOf(target)) target.after(div);
      else target.before(div);
    }, { passive: false });
    div.addEventListener("touchend", () => finishTouch(), { passive: true });
    div.addEventListener("touchcancel", () => finishTouch(true), { passive: true });
    div.addEventListener("contextmenu", e => e.preventDefault());
    div.addEventListener("click", e => {
      if (Date.now() < Math.max(suppressClickUntil, Number(slidesContainer.dataset.suppressClickUntil) || 0)) { e.preventDefault(); return; }
      abrirSlideSheet(slide);
    });
    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirSlideSheet(slide); }
    });

    // Drag & Drop para reordenar
    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", i);
      div.classList.add("dragging");
    });
    div.addEventListener("dragend", () => {
      div.classList.remove("dragging");
      slidesContainer.querySelectorAll(".slide-item").forEach(el => el.classList.remove("drag-over"));
    });
    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      slidesContainer.querySelectorAll(".slide-item").forEach(el => el.classList.remove("drag-over"));
      div.classList.add("drag-over");
    });
    div.addEventListener("dragleave", () => div.classList.remove("drag-over"));
    div.addEventListener("drop", (e) => {
      e.preventDefault();
      div.classList.remove("drag-over");
      const from = parseInt(e.dataTransfer.getData("text/plain"));
      if (from !== i) {
        const [moved] = slides.splice(from, 1);
        slides.splice(i, 0, moved);
        renderSlides();
      }
    });

    slidesContainer.appendChild(div);
  });
}

function slideImgSrc(slide) {
  return slide._blob ? URL.createObjectURL(slide._blob) : slide.url || "/imagenes/no-image.png";
}

/* ============================================================
   SIDE SHEET: EDITAR SLIDE (imagen + título + subtítulo)
   ============================================================ */
let slideSheetEl = null;

function crearSlideSheet() {
  const wrap = document.createElement("div");
  wrap.className = "side-sheet-root";
  wrap.innerHTML = `
    <div class="side-sheet-scrim"></div>
    <aside class="side-sheet" role="dialog" aria-modal="true" aria-labelledby="slideSheetTitle">
      <header class="side-sheet-header">
        <button type="button" class="side-sheet-nav side-sheet-prev" aria-label="Imagen anterior">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 id="slideSheetTitle">Imagen <span class="side-sheet-pos">1 / 1</span></h2>
        <button type="button" class="side-sheet-nav side-sheet-next" aria-label="Imagen siguiente">
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
        <button type="button" class="side-sheet-close" aria-label="Cerrar">
          <span class="material-symbols-outlined">close</span>
        </button>
      </header>
      <div class="side-sheet-body">
        <img class="side-sheet-img" alt="Imagen del carrusel">
        <button type="button" class="side-sheet-replace">
          <span class="material-symbols-outlined">image</span> Reemplazar imagen
        </button>
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden>
        <div class="slide-text-field">
          <input id="slideSheetTitleInput" type="text" placeholder=" " aria-describedby="slideTitleHint">
          <label for="slideSheetTitleInput">Título</label>
        </div>
        <span class="slide-field-hint" id="slideTitleHint">Opcional</span>
        <div class="slide-text-field">
          <input id="slideSheetSubtitleInput" type="text" placeholder=" " aria-describedby="slideSubtitleHint">
          <label for="slideSheetSubtitleInput">Subtítulo</label>
        </div>
        <span class="slide-field-hint" id="slideSubtitleHint">Opcional</span>
      </div>
      <footer class="side-sheet-footer">
        <button type="button" class="side-sheet-delete" aria-label="Eliminar imagen" title="Eliminar imagen">
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
        <button type="button" class="side-sheet-done">Listo</button>
      </footer>
    </aside>`;
  document.body.appendChild(wrap);
  slideSheetEl = wrap;
  const syncViewport = () => {
    const viewport = window.visualViewport;
    const visibleTop = viewport?.offsetTop || 0;
    const visibleBottom = visibleTop + (viewport?.height || window.innerHeight);
    const headerBottom = document.getElementById("main-header")?.getBoundingClientRect().bottom
      || (window.innerWidth <= 768 ? 64 : 72);
    const top = Math.max(visibleTop, headerBottom);
    wrap.style.top = `${top}px`;
    wrap.style.height = `${Math.max(0, visibleBottom - top)}px`;
  };
  wrap._syncViewport = syncViewport;
  window.addEventListener("resize", syncViewport);
  window.visualViewport?.addEventListener("resize", syncViewport);
  window.visualViewport?.addEventListener("scroll", syncViewport);
  syncViewport();
  wrap.querySelector(".side-sheet-scrim").addEventListener("click", cerrarSlideSheet);
  wrap.querySelector(".side-sheet-close").addEventListener("click", cerrarSlideSheet);
  wrap.querySelector(".side-sheet-done").addEventListener("click", async (e) => {
    const scope = wrap._section?.scope || "slides";
    if (scope === "reviews") { cerrarSlideSheet(); return; }
    if (await guardarConfiguracion(e, scope, e.currentTarget)) cerrarSlideSheet();
  });
  wrap.querySelector(".side-sheet-prev").addEventListener("click", () => navegarSlideSheet(-1));
  wrap.querySelector(".side-sheet-next").addEventListener("click", () => navegarSlideSheet(1));
  document.addEventListener("keydown", (e) => {
    if (!slideSheetEl.classList.contains("open")) return;
    if (e.key === "Escape") cerrarSlideSheet();
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowLeft") navegarSlideSheet(-1);
    if (e.key === "ArrowRight") navegarSlideSheet(1);
  });
  return wrap;
}

function abrirSlideSheet(slide) {
  const sheet = slideSheetEl || crearSlideSheet();
  sheet._slide = slide;
  sheet.querySelector(".side-sheet-done").textContent = "Guardar cambios";
  const img = sheet.querySelector(".side-sheet-img");
  const titleIn = sheet.querySelector("#slideSheetTitleInput");
  const subIn = sheet.querySelector("#slideSheetSubtitleInput");
  const fileIn = sheet.querySelector("input[type=file]");
  const replaceBtn = sheet.querySelector(".side-sheet-replace");
  const delBtn = sheet.querySelector(".side-sheet-delete");

  const pos = slides.indexOf(slide);
  sheet.querySelector(".side-sheet-pos").textContent = `${pos + 1} / ${slides.length}`;
  sheet.querySelector(".side-sheet-prev").disabled = pos <= 0;
  const nextBtn = sheet.querySelector(".side-sheet-next");
  nextBtn.disabled = !!slide._draft && pos === slides.length - 1;
  nextBtn.setAttribute("aria-label", pos === slides.length - 1 && !slide._draft ? "Agregar nueva imagen" : "Imagen siguiente");
  nextBtn.title = pos === slides.length - 1 && !slide._draft ? "Agregar nueva imagen" : "Imagen siguiente";
  img.hidden = !slide.url && !slide._blob;
  img.src = slideImgSrc(slide);
  replaceBtn.lastChild.textContent = slide._draft ? " Seleccionar imagen" : " Reemplazar imagen";
  titleIn.value = slide.titulo || "";
  subIn.value = slide.subtitulo || "";

  // oninput/onclick/onchange reemplazan los handlers del slide anterior
  titleIn.oninput = () => { slide.titulo = titleIn.value; };
  subIn.oninput = () => { slide.subtitulo = subIn.value; };
  replaceBtn.onclick = () => fileIn.click();
  fileIn.value = "";
  fileIn.onchange = async () => {
    const file = fileIn.files[0];
    if (!file) return;
    slide._blob = await comprimirImagen(file);
    slide._dirty = true;
    img.hidden = false;
    img.src = slideImgSrc(slide);
    renderSlides();
  };
  delBtn.onclick = () => {
    const idx = slides.indexOf(slide);
    if (idx > -1) slides.splice(idx, 1);
    renderSlides();
    cerrarSlideSheet();
  };

  mostrarConfigSheet(sheet);
}

function mostrarConfigSheet(sheet) {
  if (!sheet.classList.contains("open")) {
    sheet._returnFocus = document.activeElement;
    sheet._background = document.querySelector(".admin-config-container");
    sheet._wasInert = sheet._background?.inert;
    sheet._overflow = [document.documentElement.style.overflow, document.body.style.overflow];
    if (sheet._background) sheet._background.inert = true;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  sheet._syncViewport();
  sheet.classList.add("open");
  sheet.querySelector(".side-sheet-close").focus({ preventScroll: true });
}

function navegarSlideSheet(dir) {
  if (slideSheetEl?._section) return;
  const cur = slideSheetEl && slideSheetEl._slide;
  const idx = slides.indexOf(cur) + dir;
  if (idx >= 0 && idx < slides.length) abrirSlideSheet(slides[idx]);
  else if (dir === 1 && idx === slides.length && cur && !cur._draft) {
    const draft = { url: "", titulo: "", subtitulo: "", _draft: true };
    slides.push(draft);
    abrirSlideSheet(draft);
  }
}

function cerrarSlideSheet() {
  const sheet = slideSheetEl;
  if (!sheet?.classList.contains("open")) return;
  sheet.classList.remove("open");
  if (slides.some(slide => slide._draft)) {
    slides = slides.filter(slide => !slide._draft);
    renderSlides();
  }
  if (sheet._section) {
    const state = sheet._section;
    state.marker.replaceWith(state.content);
    state.body.remove();
    sheet.querySelector(".side-sheet-body").style.display = "";
    sheet.querySelector("#slideSheetTitle").innerHTML = state.title;
    sheet.querySelectorAll(".side-sheet-nav, .side-sheet-delete").forEach(el => { el.style.display = ""; });
    sheet._section = null;
  }
  if (sheet._background) sheet._background.inert = sheet._wasInert;
  document.documentElement.style.overflow = sheet._overflow[0];
  document.body.style.overflow = sheet._overflow[1];
  if (sheet._returnFocus?.isConnected) sheet._returnFocus.focus({ preventScroll: true });
  else slidesContainer.querySelector(".slide-item")?.focus({ preventScroll: true });
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
  historiaPreview.src = urlValida(data.historia_imagen_url) || "/imagenes/nosotros.jpg";
  originalHistoriaImgUrl = urlValida(data.historia_imagen_url);
  whatsappNumero.value = data.whatsapp_numero || "";
  whatsappNumero2.value = data.whatsapp_numero2 || "";
  facebookUrl.value = data.facebook_url || "";
  instagramUrl.value = data.instagram_url || "";
  logoPreview.src = urlValida(data.logo_url) || "/imagenes/logo.png";
  originalLogoUrl = urlValida(data.logo_url);
  logoSecPreview.src = urlValida(data.logo_secundario_url) || "/imagenes/logo_secundario.png";
  originalLogoSecUrl = urlValida(data.logo_secundario_url);
  footerTextInput.value = data.footer_text || "2026 Café Cortero. Todos los derechos reservados.";
  if (privacyEditor) privacyEditor.innerHTML = data.privacy_content || "";
  if (termsEditor) termsEditor.innerHTML = data.terms_content || "";

  slides = (data.hero_slides || []).map(s => ({ ...s }));
  renderSlides();
}

/* ============================================================
   GUARDAR CONFIGURACIÓN (UPSERT)
   ============================================================ */
async function guardarConfiguracion(e, scope = "slides", btnSave = e.currentTarget) {
  e.preventDefault();
  if (btnSave.disabled) return false;
  btnSave.disabled = true;
  btnSave.classList.add("loading");
  btnSave.textContent = "Guardando...";

  try {
    // 1. Subir imágenes pendientes de slides
    if (scope === "slides" && slides.some(s => !s.url && !s._blob)) {
      throw new Error("Selecciona una imagen antes de guardar");
    }
    for (let i = 0; scope === "slides" && i < slides.length; i++) {
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
    let historiaImagenUrl = originalHistoriaImgUrl;
    if (scope === "history" && historiaImagenBlob) {
      const fileName = `historia_${Date.now()}.webp`;
      historiaImagenUrl = await subirArchivo(historiaImagenBlob, fileName);
      historiaPreview.src = historiaImagenUrl;
      originalHistoriaImgUrl = historiaImagenUrl;
      historiaImagenBlob = null;
    }

    // 2b. Subir logo principal si cambió
    let logoUrl = originalLogoUrl;
    if (scope === "branding" && logoBlob) {
      const fileName = `logo_${Date.now()}.webp`;
      logoUrl = await subirArchivo(logoBlob, fileName);
      logoPreview.src = logoUrl;
      originalLogoUrl = logoUrl;
      logoBlob = null;
    }

    // 2c. Subir logo secundario si cambió
    let logoSecUrl = originalLogoSecUrl;
    if (scope === "branding" && logoSecBlob) {
      const fileName = `logo_sec_${Date.now()}.webp`;
      logoSecUrl = await subirArchivo(logoSecBlob, fileName);
      logoSecPreview.src = logoSecUrl;
      originalLogoSecUrl = logoSecUrl;
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
      privacy_content: privacyEditor ? privacyEditor.innerHTML.trim() : "",
      terms_content: termsEditor ? termsEditor.innerHTML.trim() : "",
      updated_at: new Date().toISOString()
    };

    const scopeFields = {
      slides: ["hero_slides"],
      history: ["historia_titulo", "historia_subtitulo", "historia_lead", "historia_body", "historia_imagen_url"],
      contact: ["whatsapp_numero", "whatsapp_numero2", "facebook_url", "instagram_url"],
      branding: ["logo_url", "logo_secundario_url", "footer_text"],
      legal: ["privacy_content", "terms_content"]
    };
    const allowed = new Set(["id", "updated_at", ...(scopeFields[scope] || [])]);
    Object.keys(payload).forEach(key => { if (!allowed.has(key)) delete payload[key]; });
    // Solo persiste los campos de la sección activa.
    const { error } = await window.supabaseClient
      .from("site_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    if (scope === "slides") slides.forEach(slide => { delete slide._draft; });
    showSnackbar("✅ Cambios de la sección guardados", "success");
    renderSlides();
    return true;
  } catch (err) {
    console.error("❌ Error al guardar:", err);
    showSnackbar(err.message || "Error al guardar la sección", "error");
    return false;
  } finally {
    btnSave.disabled = false;
    btnSave.classList.remove("loading");
    btnSave.textContent = "Guardar cambios";
  }
}

/* ============================================================
   AGREGAR SLIDE
   ============================================================ */
btnAddSlide.addEventListener("click", () => {
  const slide = { url: "", titulo: "", subtitulo: "", _draft: true };
  slides.push(slide);
  abrirSlideSheet(slide);
});


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
   ACCORDEÓN
   ============================================================ */
document.addEventListener("click", (e) => {
  const header = e.target.closest(".card-header-stitch");
  if (!header) return;
  const card = header.closest(".config-card");
  if (!card) return;
  if (card === form.querySelector(".config-card")) {
    card.classList.toggle("collapsed");
    return;
  }
  abrirSeccionSheet(card);
});

function abrirSeccionSheet(card) {
  const sheet = slideSheetEl || crearSlideSheet();
  if (sheet.classList.contains("open")) cerrarSlideSheet();
  const content = card.querySelector(".config-card-body");
  if (!content) return;
  const marker = document.createComment("section-sheet-placeholder");
  const title = sheet.querySelector("#slideSheetTitle");
  const body = document.createElement("div");
  body.className = "side-sheet-body section-sheet-body";
  const index = Array.from(form.querySelectorAll(":scope > .config-card")).indexOf(card);
  const scope = ["slides", "history", "contact", "branding", "reviews", "legal"][index];
  sheet._section = { content, marker, body, title: title.innerHTML, scope };
  sheet.querySelector(".side-sheet-done").textContent = scope === "reviews" ? "Listo" : "Guardar cambios";
  sheet._slide = null;
  content.replaceWith(marker);
  // Mantiene la asociación con configForm aun fuera del formulario.
  content.querySelectorAll("input, textarea, select, button").forEach(el => {
    if (!el.hasAttribute("form")) el.setAttribute("form", "configForm");
  });
  body.appendChild(content);
  sheet.querySelector(".side-sheet-body").style.display = "none";
  sheet.querySelector(".side-sheet-footer").before(body);
  title.textContent = card.querySelector("h2").textContent;
  sheet.querySelectorAll(".side-sheet-nav, .side-sheet-delete").forEach(el => { el.style.display = "none"; });
  mostrarConfigSheet(sheet);
  requestAnimationFrame(ajustarTextoHistoria);
}

/* ============================================================
   CARGAR RESEÑAS (ADMIN)
   ============================================================ */
async function cargarReviewsAdmin() {
  reviewsAdminList.innerHTML = '<div class="reviews-admin-loading">Cargando reseñas...</div>';

  const { data: reviews, error } = await window.supabaseClient
    .from("reviews")
    .select("id, rating, comment, user_id, hidden, created_at")
    .order("created_at", { ascending: false });

  if (error || !reviews?.length) {
    reviewsAdminList.innerHTML = '<div class="reviews-admin-empty">No hay reseñas registradas aún.</div>';
    return;
  }

  const userIds = [...new Set(reviews.map(r => r.user_id))];
  const { data: users } = await window.supabaseClient
    .from("users")
    .select("id, name, photo_url")
    .in("id", userIds);

  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  const userPhoto = u => {
    const url = userMap[u]?.photo_url;
    return url ? `<img src="${url}" alt="" class="reviews-admin-avatar" onerror="this.style.display='none'">` : '<span class="reviews-admin-avatar-placeholder">👤</span>';
  };

  reviewsAdminList.innerHTML = reviews.map(r => {
    const hidden = r.hidden === true;
    return `
    <div class="reviews-admin-item" data-id="${r.id}">
      <div class="reviews-admin-item-left">
        ${userPhoto(r.user_id)}
        <div class="reviews-admin-item-info">
          <div class="reviews-admin-item-name">${userMap[r.user_id]?.name || "Cliente"}</div>
          <div class="reviews-admin-item-stars">${Array(5).fill(0).map((_, i) => `<span class="star${i < r.rating ? ' active' : ''}">★</span>`).join('')}</div>
          <div class="reviews-admin-item-comment">"${(r.comment || 'Sin comentario')}"</div>
        </div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" class="review-toggle" ${!hidden ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </label>
    </div>`;
  }).join("");

  // Toggle directo
  reviewsAdminList.querySelectorAll(".review-toggle").forEach(toggle => {
    toggle.addEventListener("change", async () => {
      const item = toggle.closest(".reviews-admin-item");
      const id = item.dataset.id;
      const newHidden = !toggle.checked;
      const prevState = toggle.checked;

      const { error } = await window.supabaseClient
        .from("reviews")
        .update({ hidden: newHidden })
        .eq("id", id);

      if (error) {
        toggle.checked = prevState;
        showSnackbar("❌ Error al actualizar la reseña", "error");
      } else {
        showSnackbar(newHidden ? "🔇 Reseña ocultada" : "🔊 Reseña visible", "success");
      }
    });
  });
}

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
   DEFAULT LEGAL CONTENT
   ============================================================ */
function getDefaultPrivacyContent() {
  return `<h2>Datos que recopilamos</h2>
<ul>
  <li>Correo electrónico y nombre básico (si inicias sesión con Google).</li>
  <li>Datos necesarios para operar tu cuenta dentro de la aplicación.</li>
</ul>
<h2>Cómo usamos tus datos</h2>
<p>Usamos esta información únicamente para autenticarte y gestionar tu cuenta dentro de Café Cortero. No vendemos tus datos.</p>
<h2>Google Sign-In</h2>
<p>No almacenamos tu contraseña de Google. El acceso se gestiona mediante OAuth y tokens de sesión.</p>
<h2>Compartición con terceros</h2>
<p>No compartimos información personal con terceros, salvo cuando sea necesario para el funcionamiento del inicio de sesión (por ejemplo, el proveedor de autenticación).</p>
<h2>Contacto</h2>
<p class="contacto">Si tienes preguntas, escríbenos a: <a href="mailto:cafecortero@gmail.com"><strong>cafecortero@gmail.com</strong></a></p>`;
}

function getDefaultTermsContent() {
  return `<p>Al utilizar Café Cortero aceptas los presentes Términos del Servicio.</p>
<h2>Uso del servicio</h2>
<p>El servicio se proporciona "tal cual", sin garantías de disponibilidad continua ni ausencia de errores.</p>
<h2>Responsabilidad del usuario</h2>
<p>El uso de la aplicación es responsabilidad exclusiva del usuario, quien se compromete a utilizarla de forma lícita y adecuada.</p>
<h2>Modificaciones</h2>
<p>Café Cortero se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor una vez publicadas.</p>`;
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

  form.addEventListener("submit", e => e.preventDefault());

  await cargarConfiguracion();
  cargarReviewsAdmin();
})();
