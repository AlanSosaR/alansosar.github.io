-- Migration: 011_review_filters
-- Description: Add review filtering columns (admin config)

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS reviews_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reviews_min_rating SMALLINT DEFAULT 1;
