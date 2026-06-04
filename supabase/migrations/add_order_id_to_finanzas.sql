ALTER TABLE finanzas_movimientos ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_order_id ON finanzas_movimientos(order_id);
