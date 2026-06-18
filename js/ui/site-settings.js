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
    }

    window.siteSettings = data;
    window.siteSettingsLoaded = true;
    window.siteSettingsCallbacks.forEach(cb => cb(data));
    window.siteSettingsCallbacks = [];
    return data;
  } catch (err) {
    console.warn("⚠️ Error cargando site_settings:", err);
    const def = getDefaultSettings();
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
    whatsapp_numero: "50494546047",
    facebook_url: "https://www.facebook.com/share/1FsrT4DYrU/",
    instagram_url: "https://www.instagram.com/TU_USUARIO"
  };
}
