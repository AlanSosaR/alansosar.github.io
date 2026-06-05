-- ============================================================
-- Migration: Add tamano column to finanzas_movimientos
-- ============================================================

ALTER TABLE finanzas_movimientos
ADD COLUMN tamano TEXT;

