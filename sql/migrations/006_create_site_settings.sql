-- ============================================================
-- 006: Crear tabla site_settings + RLS + seed inicial
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_slides     JSONB NOT NULL DEFAULT '[]',
  historia_titulo   TEXT NOT NULL DEFAULT '',
  historia_subtitulo TEXT NOT NULL DEFAULT '',
  historia_lead     TEXT NOT NULL DEFAULT '',
  historia_body     TEXT NOT NULL DEFAULT '',
  historia_imagen_url TEXT NOT NULL DEFAULT '',
  whatsapp_numero   TEXT NOT NULL DEFAULT '',
  facebook_url      TEXT NOT NULL DEFAULT '',
  instagram_url     TEXT NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public SELECT site_settings" ON public.site_settings;
CREATE POLICY "Public SELECT site_settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin UPDATE site_settings" ON public.site_settings;
CREATE POLICY "Admin UPDATE site_settings" ON public.site_settings
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (SELECT rol FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Seed inicial con los valores actuales
INSERT INTO public.site_settings (id, hero_slides, historia_titulo, historia_subtitulo, historia_lead, historia_body, historia_imagen_url, whatsapp_numero, facebook_url, instagram_url)
VALUES (
  1,
  '[
    {"url":"/imagenes/origen1.jpg","orden":0,"titulo":"La esencia de Honduras en cada sorbo","subtitulo":"Café de altura cultivado a 1100 msnm, fresco y directo de la finca."},
    {"url":"/imagenes/origen2.jpg","orden":1,"titulo":"","subtitulo":""},
    {"url":"/imagenes/origen3.jpg","orden":2,"titulo":"","subtitulo":""},
    {"url":"/imagenes/cosecha1.jpg","orden":3,"titulo":"","subtitulo":""},
    {"url":"/imagenes/cosecha2.jpg","orden":4,"titulo":"","subtitulo":""},
    {"url":"/imagenes/cosecha3.jpg","orden":5,"titulo":"","subtitulo":""},
    {"url":"/imagenes/cosecha4.jpg","orden":6,"titulo":"","subtitulo":""},
    {"url":"/imagenes/cosecha5.jpg","orden":7,"titulo":"","subtitulo":""},
    {"url":"/imagenes/tostado1.jpg","orden":8,"titulo":"","subtitulo":""},
    {"url":"/imagenes/tostado2.jpg","orden":9,"titulo":"","subtitulo":""},
    {"url":"/imagenes/tostado3.jpg","orden":10,"titulo":"","subtitulo":""},
    {"url":"/imagenes/tostado4.jpg","orden":11,"titulo":"","subtitulo":""}
  ]'::jsonb,
  'Nuestra historia',
  'Sobre Café Cortero',
  'Café Cortero es un proyecto familiar nacido del amor por la tierra y el café bien hecho. Cada grano refleja nuestro compromiso con la calidad, el respeto al entorno y el orgullo de producir café hondureño.',
  'Desde la siembra hasta el tostado, cuidamos cada etapa de forma artesanal, combinando tradición, dedicación y experiencia para que disfrutes en cada taza un café honesto y lleno de sabor.',
  '/imagenes/nosotros.jpg',
  '50494546047',
  'https://www.facebook.com/share/1FsrT4DYrU/',
  'https://www.instagram.com/TU_USUARIO'
)
ON CONFLICT (id) DO NOTHING;
