-- ============================================================
--  Migración 002: CFDI de Egreso vinculado a la devolución
--  Ejecutar UNA SOLA VEZ en la base de datos
-- ============================================================

-- 1. devolucion_cliente: guardar la factura de egreso timbrada
ALTER TABLE devolucion_cliente
    ADD COLUMN IF NOT EXISTS uuid_cfdi_egreso   VARCHAR(50)  NULL,
    ADD COLUMN IF NOT EXISTS id_factura_egreso  UUID         NULL
        REFERENCES facturas(id_factura) ON DELETE SET NULL;

COMMENT ON COLUMN devolucion_cliente.uuid_cfdi_egreso
    IS 'UUID SAT del CFDI-E (egreso/nota de crédito) generado al aprobar la devolución';

COMMENT ON COLUMN devolucion_cliente.id_factura_egreso
    IS 'Registro en tabla facturas que corresponde al CFDI-E emitido';

-- 2. nota_credito_cliente: referencias al CFDI-E
ALTER TABLE nota_credito_cliente
    ADD COLUMN IF NOT EXISTS uuid_cfdi_egreso VARCHAR(50) NULL;

COMMENT ON COLUMN nota_credito_cliente.uuid_cfdi_egreso
    IS 'UUID SAT del CFDI-E asociado (mismo que devolucion_cliente.uuid_cfdi_egreso)';

-- 3. devolucion_cliente: recepción física de mercancía
ALTER TABLE devolucion_cliente
    ADD COLUMN IF NOT EXISTS recibio_mercancia         BOOLEAN   NULL,
    ADD COLUMN IF NOT EXISTS fecha_recepcion_mercancia DATE      NULL;

COMMENT ON COLUMN devolucion_cliente.recibio_mercancia
    IS 'true = se recibió la mercancía físicamente al aprobar; false = solo efectos financieros; null = no aplicado aún';

COMMENT ON COLUMN devolucion_cliente.fecha_recepcion_mercancia
    IS 'Fecha en que se registró la entrada de mercancía devuelta';

-- 4. pago_cxc: el estado DEV ya es válido como CHAR(3),
--    no requiere constraint adicional, pero documentamos aquí el catálogo:
COMMENT ON COLUMN pago_cxc.estatus_pago
    IS 'CAP = Capturado (pendiente de aplicar) | APL = Aplicado (requiere CFDI complemento) | DEV = Aplicado por devolución (el CFDI-E es el comprobante, sin complemento de pago) | CAN = Cancelado';
