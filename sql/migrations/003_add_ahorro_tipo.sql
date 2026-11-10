-- ============================================================
-- Migration: Add 'ahorro' to tipo CHECK constraint
-- ============================================================

ALTER TABLE finanzas_movimientos
DROP CONSTRAINT IF EXISTS finanzas_movimientos_tipo_check;

ALTER TABLE finanzas_movimientos
ADD CONSTRAINT finanzas_movimientos_tipo_check
CHECK (tipo IN ('ingreso', 'egreso', 'ahorro'));
