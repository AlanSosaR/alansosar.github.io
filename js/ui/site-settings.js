/* ============================================================
   SITE SETTINGS LOADER — Carga configuración desde Supabase
   ============================================================ */
window.siteSettings = null;
window.siteSettingsLoaded = false;
window.siteSettingsCallbacks = [];

window.loadSiteSettings = async function () {
  if (window.siteSettingsLoaded) return window.siteSettings;
  try {
    await esperarSupabaseSettings();
    const { data, error } = await window.supabaseClient
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.warn("⚠️ No se pudo cargar site_settings, usando defaults");
      data = getDefaultSettings();
      applySiteSettings(data);
    }

    // Sanitizar URLs corruptas (localhost/127.0.0.1 guardado por error)
    sanitizarURLs(data);

    window.siteSettings = data;
    window.siteSettingsLoaded = true;
    applySiteSettings(data);
    window.siteSettingsCallbacks.forEach(cb => cb(data));
    window.siteSettingsCallbacks = [];
    return data;
  } catch (err) {
    console.warn("⚠️ Error cargando site_settings:", err);
    const def = getDefaultSettings();
    applySiteSettings(def);
    window.siteSettings = def;
    window.siteSettingsLoaded = true;
    return def;
  }
};

function esperarSupabaseSettings() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) { clearInterval(i); resolve(); }
    }, 80);
  });
}

function getDefaultSettings() {
  return {
    hero_slides: [
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
    ],
    historia_titulo: "Nuestra historia",
    historia_subtitulo: "Sobre Café Cortero",
    historia_lead: "Café Cortero es un proyecto familiar nacido del amor por la tierra y el café bien hecho. Cada grano refleja nuestro compromiso con la calidad, el respeto al entorno y el orgullo de producir café hondureño.",
    historia_body: "Desde la siembra hasta el tostado, cuidamos cada etapa de forma artesanal, combinando tradición, dedicación y experiencia para que disfrutes en cada taza un café honesto y lleno de sabor.",
    historia_imagen_url: "/imagenes/nosotros.jpg",
    whatsapp_numero: "50496670613",
    whatsapp_numero2: "50498675101",
    facebook_url: "https://www.facebook.com/share/1FsrT4DYrU/",
    instagram_url: "https://www.instagram.com/TU_USUARIO",
    logo_url: "/imagenes/logo.png",
    logo_secundario_url: "/imagenes/logo_secundario.png",
    footer_text: "2026 Café Cortero. Todos los derechos reservados.",
    favicon_url: "/imagenes/logo.png",
    privacy_content: "",
    terms_content: ""
  };
}

/* ============================================================
   SANITIZAR URLs CORRUPTAS (localhost/127.0.0.1)
   ============================================================ */
function sanitizarURLs(data) {
  const campos = ["logo_url", "logo_secundario_url", "favicon_url", "historia_imagen_url"];
  const defaults = {
    logo_url: "/imagenes/logo.png",
    logo_secundario_url: "/imagenes/logo_secundario.png",
    favicon_url: "/imagenes/logo.png",
    historia_imagen_url: "/imagenes/nosotros.jpg"
  };
  campos.forEach(campo => {
    if (data[campo] && /localhost|127\.0\.0\.1/.test(data[campo])) {
      data[campo] = defaults[campo] || "";
    }
  });
  // Slides
  if (Array.isArray(data.hero_slides)) {
    data.hero_slides.forEach(s => {
      if (s.url && /localhost|127\.0\.0\.1/.test(s.url)) {
        s.url = "/imagenes/origen1.jpg";
      }
    });
  }
}

/* ============================================================
   LIMPIAR URL LOCALHOST (datos corruptos)
   ============================================================ */
function urlValida(url) {
  if (!url) return "";
  if (/localhost|127\.0\.0\.1/.test(url)) return "";
  return url;
}

/* ============================================================
   APLICAR SETTINGS DINÁMICOS — Logo, Footer, Favicon
   ============================================================ */
function applySiteSettings(s) {
  if (!s) return;

  // Logo header
  const headerLogo = document.querySelector(".header-logo");
  if (headerLogo) headerLogo.src = urlValida(s.logo_url) || "/imagenes/logo.png";

  // Footer
  const footerLogo = document.getElementById("footer-logo-img");
  if (footerLogo) footerLogo.src = urlValida(s.logo_secundario_url) || "/imagenes/logo_secundario.png";
  const footerText = document.getElementById("footer-copy-text");
  if (footerText && s.footer_text) footerText.textContent = s.footer_text;

  // Favicon dinámico
  const faviconUrl = urlValida(s.favicon_url) || "/imagenes/logo.png";
  const existingIcon = document.querySelector('link[rel="icon"]');
  if (existingIcon) {
    existingIcon.href = faviconUrl;
  } else {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = faviconUrl;
    document.head.appendChild(link);
  }
}

/* ============================================================
   AUTO-INIT — Se ejecuta al cargar el script en cualquier página
   ============================================================ */
(function autoInit() {
  if (window.__SITE_SETTINGS_AUTO_INIT__) return;
  window.__SITE_SETTINGS_AUTO_INIT__ = true;
  // Aplicar defaults inmediatamente para evitar parpadeo
  applySiteSettings(getDefaultSettings());
  // Luego cargar desde Supabase cuando esté listo
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.supabaseClient) {
        window.loadSiteSettings().catch(() => {});
      }
    }, 100);
  });
})();
