-- Columnas/constraints nuevos en tablas que YA existían (dbLocal.sync() solo crea tablas nuevas, no agrega columnas).
-- Se puede ejecutar varias veces sin problema.

-- 1) Vales: pagado al momento + comentario (pedido_almacen)
ALTER TABLE pedido_almacen ADD COLUMN IF NOT EXISTS vale_pagado     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pedido_almacen ADD COLUMN IF NOT EXISTS comentario_vale TEXT NULL;

-- 2) Código interno del artículo en el sistema del proveedor
ALTER TABLE detalle_listado_proveedor ADD COLUMN IF NOT EXISTS cod_interno_articulo_prove_detlist VARCHAR(60) NULL;

-- 3) Detalle de factura: el artículo puede ser nulo (conceptos sin artículo)
ALTER TABLE detalle_factura ALTER COLUMN id_articulo DROP NOT NULL;

-- 4) Inventario: nuevos tipos permitidos (SIN_UBICACION, ROTACION, MULTILOTE)
ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_tipo_inventario_check;
ALTER TABLE inventario ADD CONSTRAINT inventario_tipo_inventario_check
  CHECK (tipo_inventario IN ('GENERAL','PASILLO','TARIMA','UBICACION','ARTICULO','SIN_UBICACION','ROTACION','MULTILOTE'));
