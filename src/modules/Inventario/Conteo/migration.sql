-- ── Inventario (encabezado) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventario (
    id_inventario         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa_sucursal   UUID NOT NULL REFERENCES empresa_sucursal(id_empre),
    tipo_inventario       VARCHAR(20) NOT NULL CHECK (tipo_inventario IN ('GENERAL','PASILLO','UBICACION','ARTICULO')),
    status                VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
                              CHECK (status IN ('BORRADOR','EN_CONTEO','TERMINADO','APLICADO','CANCELADO')),
    filtro                JSONB,
    fecha_aplicacion      TIMESTAMPTZ,
    creado_por            UUID,
    aplicado_por          UUID,
    notas                 TEXT,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Detalle inventario ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.detalle_inventario (
    id_detalle_inventario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_inventario         UUID NOT NULL REFERENCES inventario(id_inventario) ON DELETE CASCADE,
    id_articulo           UUID NOT NULL REFERENCES articulo(id_artic),
    id_ubicacion_sucursal UUID REFERENCES ubicacion_sucursal(id_ubicacion_sucursal),
    id_lote               UUID REFERENCES lote_articulo_sucursal(id_lote_sucursal),
    cant_sistema          NUMERIC(13,4) NOT NULL DEFAULT 0,
    cant_contada          NUMERIC(13,4),
    contado               BOOLEAN NOT NULL DEFAULT FALSE,
    ajustar               BOOLEAN NOT NULL DEFAULT TRUE,
    ajustado              BOOLEAN NOT NULL DEFAULT FALSE,
    comentario            TEXT,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detalle_inventario_inv ON detalle_inventario(id_inventario);
CREATE INDEX IF NOT EXISTS idx_detalle_inventario_art ON detalle_inventario(id_articulo);
