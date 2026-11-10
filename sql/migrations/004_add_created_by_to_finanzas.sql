-- ============================================================
-- Migration: Add created_by FK to finanzas_movimientos
-- ============================================================

ALTER TABLE finanzas_movimientos
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finanzas_created_by ON finanzas_movimientos(created_by);
