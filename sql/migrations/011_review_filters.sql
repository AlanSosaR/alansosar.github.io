-- Migration: 011_review_filters
-- Description: Add review filtering columns (admin config)

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS reviews_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reviews_min_rating SMALLINT DEFAULT 1;

-- Allow admins to update any review (for hiding reviews)
CREATE POLICY "Admins can update any review"
  ON reviews FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND rol = 'admin')
  );
