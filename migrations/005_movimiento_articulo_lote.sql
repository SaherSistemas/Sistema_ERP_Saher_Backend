-- Agrega trazabilidad de lote a los movimientos manuales de almacén (ajuste de inventario).
-- Nullable: los movimientos ya existentes quedan sin lote asociado.
ALTER TABLE movimiento_articulo
  ADD COLUMN IF NOT EXISTS id_lote UUID NULL REFERENCES lote_articulo_sucursal(id_lote_sucursal);
