-- ============================================================
--  Corrección manual: devolucion 36aef639 se fue a NOTA_CREDITO
--  pero debía haberse descontado de la CxC (flujo Público General)
--
--  ANTES de ejecutar este script:
--  1. Averigua el id_cxc correcto con:
--       SELECT id_cxc, id_remision, estatus_cxc, monto_total, saldo_pendiente
--       FROM cuenta_por_cobrar
--       WHERE id_remision IN (
--           SELECT id_remision FROM remision
--           WHERE id_factura = '46b09495-0c8c-409e-bfb7-d180f7aca92a'
--       );
--
--  2. Sustituye :ID_CXC con el UUID que devuelva la consulta anterior
--  3. Verifica que el saldo actual sea el correcto antes del descuento
-- ============================================================

-- Paso 1: Eliminar la nota de crédito incorrecta
DELETE FROM nota_credito_cliente
WHERE id_devolucion_cliente = '36aef639-fb0c-4b15-85a7-8701a59346da';

-- Paso 2: Descontar $78.05 de la CxC correspondiente
--         Reemplaza :ID_CXC con el UUID que encontraste arriba
UPDATE cuenta_por_cobrar
SET
    monto_total      = GREATEST(0, monto_total - 78.05),
    saldo_pendiente  = GREATEST(0, saldo_pendiente - 78.05),
    estatus_cxc      = CASE
                           WHEN GREATEST(0, saldo_pendiente - 78.05) <= 0 THEN 'PAG'
                           WHEN monto_pagado > 0                          THEN 'PAR'
                           ELSE 'PEN'
                       END,
    "updatedAt"      = NOW()
WHERE id_cxc = :ID_CXC;   -- <-- reemplaza con el UUID real

-- Paso 3: Registrar el resultado correcto en la devolución
UPDATE devolucion_cliente
SET
    resultado_aprobacion = 'DESCUENTO_CXC',
    id_cxc_afectada      = :ID_CXC,    -- <-- reemplaza con el UUID real
    "updatedAt"          = NOW()
WHERE id_devolucion_cliente = '36aef639-fb0c-4b15-85a7-8701a59346da';

-- ============================================================
--  ALTERNATIVA: Si prefieres DEJAR la nota de crédito como está
--  (el cliente tiene $78.05 de crédito disponible para facturas futuras),
--  simplemente no ejecutes este script.
--  La nota se puede aplicar desde el sistema cuando haya una nueva factura.
-- ============================================================
