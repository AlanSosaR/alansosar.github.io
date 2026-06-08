-- ============================================================
-- Migration: Add product_id FK to finanzas_movimientos
-- ============================================================

ALTER TABLE finanzas_movimientos
ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_finanzas_product_id ON finanzas_movimientos(product_id);
