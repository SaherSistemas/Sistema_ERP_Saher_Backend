-- Devoluciones de REMISIONES (sin CFDI): una devolución ahora puede ir contra una factura (id_factura) o contra una
-- remisión sin factura (id_remision). Exactamente una de las dos viene llena.
--
-- Ejecutar UNA vez en la base de datos (sequelize.sync() no modifica columnas de tablas que ya existen).

ALTER TABLE devolucion_cliente ALTER COLUMN id_factura DROP NOT NULL;

ALTER TABLE devolucion_cliente ADD COLUMN IF NOT EXISTS id_remision UUID NULL REFERENCES remision (id_remision);

CREATE INDEX IF NOT EXISTS idx_devolucion_cliente_id_remision ON devolucion_cliente (id_remision);

-- Verificación opcional:
-- SELECT column_name, is_nullable FROM information_schema.columns
--  WHERE table_name = 'devolucion_cliente' AND column_name IN ('id_factura', 'id_remision');
