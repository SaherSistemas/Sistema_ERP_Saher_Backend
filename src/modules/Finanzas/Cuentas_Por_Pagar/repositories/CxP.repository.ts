import { Op, QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { v4 as uuidv4 } from 'uuid';
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';
import Pago_CxP from '../model/Pago_CxP.model';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Empleado from '../../../RRHH/model/Empleado';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';


export const CxPRepository = {

    // ── Lista de CxP con filtros ──────────────────────────────────────────────
    getAll: async (filtros: {
        id_proveedor?: string;
        estatus_cxp?:  string;
        fecha_inicio?: string;
        fecha_fin?:    string;
        vencidas?:     boolean;
    }) => {
        const where: any = {};
        if (filtros.id_proveedor) where.id_proveedor = filtros.id_proveedor;
        if (filtros.estatus_cxp)  where.estatus_cxp  = filtros.estatus_cxp;
        if (filtros.vencidas) {
            where.fecha_vencimiento = { [Op.lt]: new Date() };
            where.saldo_pendiente   = { [Op.gt]: 0 };
        }
        if (filtros.fecha_inicio || filtros.fecha_fin) {
            where.fecha_vencimiento = {};
            if (filtros.fecha_inicio) where.fecha_vencimiento[Op.gte] = new Date(filtros.fecha_inicio);
            if (filtros.fecha_fin)    where.fecha_vencimiento[Op.lte] = new Date(filtros.fecha_fin + 'T23:59:59');
        }

        return await Cuenta_Por_Pagar.findAll({
            where,
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove', 'limicre_prove', 'diascre_prove'] },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    // ── Por proveedor con sus pagos ───────────────────────────────────────────
    getByProveedor: async (id_proveedor: string) => {
        return await Cuenta_Por_Pagar.findAll({
            where: { id_proveedor },
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove'] },
                { model: Pago_CxP,  as: 'pagos', include: [{ model: Cat_Forma_De_Pago }] },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    // ── Por ID ───────────────────────────────────────────────────────────────
    getById: async (id_cxp: string) => {
        return await Cuenta_Por_Pagar.findByPk(id_cxp, {
            include: [
                { model: Proveedor, attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove', 'limicre_prove'] },
                {
                    model: Pago_CxP, as: 'pagos',
                    include: [
                        { model: Cat_Forma_De_Pago },
                        { model: Empleado, attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'] },
                    ],
                },
            ],
        });
    },

    // ── Crear CxP ────────────────────────────────────────────────────────────
    create: async (data: {
        id_factura_proveedor?: string;
        id_proveedor:    string;
        folio_factura?:  string;
        fecha_factura?:  string;
        fecha_vencimiento: string;
        monto_total:     number;
        notas?:          string;
        id_empleado_registro?: string;
    }) => {
        return await Cuenta_Por_Pagar.create({
            id_cxp:               uuidv4(),
            id_factura_proveedor: data.id_factura_proveedor ?? null,
            id_proveedor:         data.id_proveedor,
            folio_factura:        data.folio_factura ?? null,
            fecha_factura:        data.fecha_factura ? new Date(data.fecha_factura) : null,
            fecha_vencimiento:    new Date(data.fecha_vencimiento),
            monto_total:          data.monto_total,
            monto_pagado:         0,
            saldo_pendiente:      data.monto_total,
            estatus_cxp:          'PEN',
            notas:                data.notas ?? null,
            id_empleado_registro: data.id_empleado_registro ?? null,
        });
    },

    // ── Registrar pago + actualizar saldo ─────────────────────────────────────
    registrarPago: async (data: {
        id_cxp:           string;
        monto_pago:       number;
        fecha_pago:       string;
        id_forma_pago?:   string;
        referencia_pago?: string;
        notas?:           string;
        url_comprobante?: string;
        id_empleado_captura?: string;
    }) => {
        const t = await dbLocal.transaction();
        try {
            const cxp = await Cuenta_Por_Pagar.findByPk(data.id_cxp, { transaction: t });
            if (!cxp) throw new Error('CxP no encontrada');
            if (cxp.estatus_cxp === 'PAG') throw new Error('Esta cuenta ya está pagada');
            if (cxp.estatus_cxp === 'CAN') throw new Error('Esta cuenta está cancelada');
            if (data.monto_pago > Number(cxp.saldo_pendiente))
                throw new Error(`El pago ($${data.monto_pago}) excede el saldo pendiente ($${cxp.saldo_pendiente})`);

            // Crear pago
            const pago = await Pago_CxP.create({
                id_pago_cxp:        uuidv4(),
                id_cxp:             data.id_cxp,
                monto_pago:         data.monto_pago,
                fecha_pago:         new Date(data.fecha_pago),
                id_forma_pago:      data.id_forma_pago ?? null,
                referencia_pago:    data.referencia_pago ?? null,
                notas:              data.notas ?? null,
                url_comprobante:    data.url_comprobante ?? null,
                id_empleado_captura: data.id_empleado_captura ?? null,
                estatus_pago:       'APL',
                created_at:         new Date(),
            }, { transaction: t });

            // Actualizar saldo
            const nuevoMontoPagado  = +(Number(cxp.monto_pagado) + data.monto_pago).toFixed(2);
            const nuevoSaldo        = +(Number(cxp.monto_total)   - nuevoMontoPagado).toFixed(2);
            const nuevoEstatus      = nuevoSaldo <= 0 ? 'PAG' : 'PAR';

            await Cuenta_Por_Pagar.update({
                monto_pagado:    nuevoMontoPagado,
                saldo_pendiente: Math.max(0, nuevoSaldo),
                estatus_cxp:     nuevoEstatus,
            }, { where: { id_cxp: data.id_cxp }, transaction: t });

            // Si quedó pagada, marcar la factura como PAGADA
            if (nuevoEstatus === 'PAG' && cxp.id_factura_proveedor) {
                await Factura_Compra_Proveedor.update(
                    { estatus_pago_factura: 'PAGADA' },
                    { where: { id_factura_proveedor: cxp.id_factura_proveedor }, transaction: t }
                );
            }

            await t.commit();
            return { pago, nuevo_saldo: Math.max(0, nuevoSaldo), estatus: nuevoEstatus };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // ── Marcar vencidas ───────────────────────────────────────────────────────
    marcarVencidas: async () => {
        return await Cuenta_Por_Pagar.update(
            { estatus_cxp: 'VEN' },
            { where: { fecha_vencimiento: { [Op.lt]: new Date() }, saldo_pendiente: { [Op.gt]: 0 }, estatus_cxp: { [Op.in]: ['PEN', 'PAR'] } } }
        );
    },

    // ── Dashboard: resumen general ────────────────────────────────────────────
    getResumen: async () => {
        const rows = await dbLocal.query<{
            total_facturas:    number;
            total_pendiente:   number;
            total_vencido:     number;
            total_pagado_mes:  number;
        }>(`
            SELECT
                COUNT(*)::int                                                               AS total_facturas,
                COALESCE(SUM(CASE WHEN estatus_cxp IN ('PEN','PAR','VEN') THEN saldo_pendiente ELSE 0 END), 0) AS total_pendiente,
                COALESCE(SUM(CASE WHEN estatus_cxp = 'VEN' THEN saldo_pendiente ELSE 0 END), 0)               AS total_vencido,
                COALESCE(SUM(CASE WHEN DATE_TRUNC('month', "updatedAt") = DATE_TRUNC('month', NOW())
                                   AND estatus_cxp = 'PAG' THEN monto_total ELSE 0 END), 0)                    AS total_pagado_mes
            FROM cuenta_por_pagar
            WHERE estatus_cxp != 'CAN'
        `, { type: QueryTypes.SELECT });
        return rows[0];
    },

    // ── Saldo histórico por proveedor al día X ────────────────────────────────
    getSaldoHistoricoProveedor: async (id_prove: string, fecha_corte: string) => {

        const proveedor = await Proveedor.findByPk(id_prove, {
            attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'],
        });

        const rows = await dbLocal.query<{
            id_cxp:             string;
            folio_factura:      string;
            fecha_factura:      string;
            fecha_vencimiento:  string;
            monto_original:     string;
            pagado_hasta_fecha: string;
            saldo_en_fecha:     string;
            vencida_en_fecha:   boolean;
        }>(`
            SELECT
                cxp.id_cxp,
                COALESCE(cxp.folio_factura, '—')                        AS folio_factura,
                TO_CHAR(cxp.fecha_factura,      'YYYY-MM-DD')           AS fecha_factura,
                TO_CHAR(cxp.fecha_vencimiento,  'YYYY-MM-DD')           AS fecha_vencimiento,
                cxp.monto_total                                          AS monto_original,
                COALESCE(SUM(
                    CASE WHEN p.estatus_pago = 'APL'
                              AND p.fecha_pago::DATE <= :fecha_corte
                         THEN p.monto_pago ELSE 0 END
                ), 0)                                                    AS pagado_hasta_fecha,
                GREATEST(0,
                    cxp.monto_total - COALESCE(SUM(
                        CASE WHEN p.estatus_pago = 'APL'
                                  AND p.fecha_pago::DATE <= :fecha_corte
                             THEN p.monto_pago ELSE 0 END
                    ), 0)
                )                                                        AS saldo_en_fecha,
                (cxp.fecha_vencimiento < :fecha_corte::DATE)            AS vencida_en_fecha
            FROM cuenta_por_pagar  cxp
            LEFT JOIN pago_cxp     p ON p.id_cxp = cxp.id_cxp
            WHERE cxp.id_proveedor = :id_prove
              AND cxp."createdAt"::DATE <= :fecha_corte
              AND cxp.estatus_cxp != 'CAN'
            GROUP BY
                cxp.id_cxp, cxp.folio_factura, cxp.fecha_factura,
                cxp.fecha_vencimiento, cxp.monto_total
            HAVING GREATEST(0,
                cxp.monto_total - COALESCE(SUM(
                    CASE WHEN p.estatus_pago = 'APL'
                              AND p.fecha_pago::DATE <= :fecha_corte
                         THEN p.monto_pago ELSE 0 END
                ), 0)
            ) > 0
            ORDER BY cxp.fecha_vencimiento ASC
        `, {
            replacements: { id_prove, fecha_corte },
            type: QueryTypes.SELECT,
        });

        const detalle = rows.map(r => ({
            id_cxp:             r.id_cxp,
            folio_factura:      r.folio_factura,
            fecha_factura:      r.fecha_factura,
            fecha_vencimiento:  r.fecha_vencimiento,
            monto_original:     Number(r.monto_original),
            pagado_hasta_fecha: Number(r.pagado_hasta_fecha),
            saldo_en_fecha:     Number(r.saldo_en_fecha),
            vencida_en_fecha:   r.vencida_en_fecha,
        }));

        const total_saldo   = detalle.reduce((s, r) => s + r.saldo_en_fecha,   0);
        const total_vencido = detalle.filter(r => r.vencida_en_fecha).reduce((s, r) => s + r.saldo_en_fecha, 0);

        return {
            proveedor: proveedor ? {
                nombre:    proveedor.nomcort_prove || proveedor.razsoc_prove,
                rfc:       proveedor.rfc_prove,
            } : null,
            fecha_corte,
            resumen: {
                total_saldo,
                total_vencido,
                total_vigente:  total_saldo - total_vencido,
                num_facturas:   detalle.length,
            },
            detalle,
        };
    },

    // ── Saldos globales de TODOS los proveedores al día X ────────────────────
    getSaldosGlobalesProveedores: async (fecha_corte: string) => {
        return await dbLocal.query<{
            id_prove:      string;
            nombre:        string;
            rfc:           string;
            num_facturas:  number;
            total_saldo:   string;
            total_vencido: string;
            total_vigente: string;
        }>(`
            SELECT
                p.id_prove,
                COALESCE(p.nomcort_prove, p.razsoc_prove) AS nombre,
                COALESCE(p.rfc_prove, '')                  AS rfc,
                COUNT(DISTINCT cxp.id_cxp)::int           AS num_facturas,
                COALESCE(SUM(
                    GREATEST(0, cxp.monto_total - COALESCE((
                        SELECT SUM(pg.monto_pago)
                        FROM pago_cxp pg
                        WHERE pg.id_cxp = cxp.id_cxp
                          AND pg.estatus_pago = 'APL'
                          AND pg.fecha_pago::DATE <= :fecha_corte
                    ), 0))
                ), 0) AS total_saldo,
                COALESCE(SUM(
                    CASE WHEN cxp.fecha_vencimiento < :fecha_corte::DATE THEN
                        GREATEST(0, cxp.monto_total - COALESCE((
                            SELECT SUM(pg.monto_pago) FROM pago_cxp pg
                            WHERE pg.id_cxp = cxp.id_cxp AND pg.estatus_pago = 'APL'
                              AND pg.fecha_pago::DATE <= :fecha_corte
                        ), 0))
                    ELSE 0 END
                ), 0) AS total_vencido,
                COALESCE(SUM(
                    CASE WHEN cxp.fecha_vencimiento >= :fecha_corte::DATE THEN
                        GREATEST(0, cxp.monto_total - COALESCE((
                            SELECT SUM(pg.monto_pago) FROM pago_cxp pg
                            WHERE pg.id_cxp = cxp.id_cxp AND pg.estatus_pago = 'APL'
                              AND pg.fecha_pago::DATE <= :fecha_corte
                        ), 0))
                    ELSE 0 END
                ), 0) AS total_vigente
            FROM proveedor p
            INNER JOIN cuenta_por_pagar cxp ON cxp.id_proveedor = p.id_prove
                AND cxp."createdAt"::DATE <= :fecha_corte
                AND cxp.estatus_cxp != 'CAN'
            WHERE p.activo_prove = TRUE
            GROUP BY p.id_prove, p.nomcort_prove, p.razsoc_prove, p.rfc_prove
            HAVING COALESCE(SUM(
                GREATEST(0, cxp.monto_total - COALESCE((
                    SELECT SUM(pg.monto_pago) FROM pago_cxp pg
                    WHERE pg.id_cxp = cxp.id_cxp AND pg.estatus_pago = 'APL'
                      AND pg.fecha_pago::DATE <= :fecha_corte
                ), 0))
            ), 0) > 0
            ORDER BY total_saldo DESC
        `, { replacements: { fecha_corte }, type: QueryTypes.SELECT });
    },

    // ── Dashboard: crédito por proveedor ──────────────────────────────────────
    getCreditoPorProveedor: async () => {
        const rows = await dbLocal.query<{
            id_prove:      string;
            nombre:        string;
            limite_credito: number;
            usado:         number;
        }>(`
            SELECT
                p.id_prove,
                COALESCE(p.nomcort_prove, p.razsoc_prove) AS nombre,
                COALESCE(p.limicre_prove, 0)              AS limite_credito,
                COALESCE(SUM(c.saldo_pendiente), 0)       AS usado
            FROM proveedor p
            LEFT JOIN cuenta_por_pagar c
                ON c.id_proveedor = p.id_prove
                AND c.estatus_cxp NOT IN ('PAG','CAN')
            WHERE p.activo_prove = TRUE
              AND (p.limicre_prove > 0 OR EXISTS (
                  SELECT 1 FROM cuenta_por_pagar cc WHERE cc.id_proveedor = p.id_prove AND cc.estatus_cxp != 'CAN'
              ))
            GROUP BY p.id_prove, p.nomcort_prove, p.razsoc_prove, p.limicre_prove
            ORDER BY usado DESC
            LIMIT 15
        `, { type: QueryTypes.SELECT });
        return rows;
    },

    // ── Dashboard: antigüedad de saldos ───────────────────────────────────────
    getAntiguedad: async () => {
        const rows = await dbLocal.query<{
            tramo:  string;
            total:  number;
            monto:  number;
        }>(`
            SELECT tramo, total, monto
            FROM (
                SELECT
                    CASE
                        WHEN fecha_vencimiento >= CURRENT_DATE       THEN 'Corriente'
                        WHEN fecha_vencimiento >= CURRENT_DATE - 30  THEN '1-30 días'
                        WHEN fecha_vencimiento >= CURRENT_DATE - 60  THEN '31-60 días'
                        WHEN fecha_vencimiento >= CURRENT_DATE - 90  THEN '61-90 días'
                        ELSE '+90 días'
                    END                               AS tramo,
                    COUNT(*)::int                     AS total,
                    COALESCE(SUM(saldo_pendiente), 0) AS monto
                FROM cuenta_por_pagar
                WHERE estatus_cxp IN ('PEN','PAR','VEN')
                GROUP BY 1
            ) t
            ORDER BY
                CASE tramo
                    WHEN 'Corriente'  THEN 1
                    WHEN '1-30 días'  THEN 2
                    WHEN '31-60 días' THEN 3
                    WHEN '61-90 días' THEN 4
                    ELSE 5
                END
        `, { type: QueryTypes.SELECT });
        return rows;
    },
};
