ALTER TABLE public.site_settings
  ADD COLUMN logo_url TEXT DEFAULT '/imagenes/logo.png',
  ADD COLUMN logo_secundario_url TEXT DEFAULT '/imagenes/logo_secundario.png',
  ADD COLUMN footer_text TEXT DEFAULT '2026 Café Cortero. Todos los derechos reservados.',
  ADD COLUMN favicon_url TEXT DEFAULT '/imagenes/logo.png';
