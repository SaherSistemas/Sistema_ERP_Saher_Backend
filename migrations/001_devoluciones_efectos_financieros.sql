-- ============================================================
--  Migración: Efectos financieros de devoluciones
--  Ejecutar UNA SOLA VEZ en la base de datos
-- ============================================================

-- 1. Extender tabla devolucion_cliente con columnas de resultado
ALTER TABLE devolucion_cliente
    ADD COLUMN IF NOT EXISTS resultado_aprobacion  VARCHAR(20)  NULL,
    ADD COLUMN IF NOT EXISTS id_cxc_afectada       UUID         NULL
        REFERENCES cuenta_por_cobrar(id_cxc) ON DELETE SET NULL;

COMMENT ON COLUMN devolucion_cliente.resultado_aprobacion
    IS 'DESCUENTO_CXC = se descontó del saldo CxC | NOTA_CREDITO = se generó nota de crédito';

COMMENT ON COLUMN devolucion_cliente.id_cxc_afectada
    IS 'CxC cuyo saldo fue reducido al aprobar (solo cuando resultado_aprobacion = DESCUENTO_CXC)';

-- 2. Crear tabla nota_credito_cliente
CREATE TABLE IF NOT EXISTS nota_credito_cliente (
    id_nota_credito         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente_alm          UUID            NOT NULL REFERENCES cliente_almacen(id_cliente_alm),
    id_devolucion_cliente   UUID            NOT NULL REFERENCES devolucion_cliente(id_devolucion_cliente),
    monto_original          DECIMAL(12,2)   NOT NULL,
    saldo_disponible        DECIMAL(12,2)   NOT NULL,
    estatus                 VARCHAR(15)     NOT NULL DEFAULT 'DISPONIBLE',
    -- DISPONIBLE | PARCIAL | APLICADA
    concepto                TEXT            NULL,
    "createdAt"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nota_credito_cliente
    IS 'Notas de crédito generadas al aprobar una devolución cuya factura ya estaba pagada';

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_nc_cliente  ON nota_credito_cliente(id_cliente_alm);
CREATE INDEX IF NOT EXISTS idx_nc_dev      ON nota_credito_cliente(id_devolucion_cliente);
CREATE INDEX IF NOT EXISTS idx_nc_estatus  ON nota_credito_cliente(estatus);
