import { v4 as uuidv4 } from 'uuid';
import { fn, col, Op, Transaction, QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Cuenta_Por_Cobrar from '../model/Cuenta_Por_Cobrar.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Remision from '../../Remisiones/model/Remision.model';
import Facturas from '../../../Facturas/model/Facturas.model';

interface ICreateCxC {
    id_cliente_alm: string;
    monto_total: number;
    fecha_vencimiento: Date;
    dias_credito: number;
    id_factura?: string;     // flujo normal
    id_remision?: string;    // flujo Público General
}

export const CxCRepository = {

    getAll: async () => {
        return await Cuenta_Por_Cobrar.findAll({
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'], required: false },
                { model: Remision, attributes: ['id_remision', 'folio_remision', 'fecha_remision'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    getByCliente: async (id_cliente_alm: string) => {
        return await Cuenta_Por_Cobrar.findAll({
            where: { id_cliente_alm },
            include: [
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'], required: false },
                { model: Remision, attributes: ['id_remision', 'folio_remision', 'total_remision'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    getVencidas: async () => {
        return await Cuenta_Por_Cobrar.findAll({
            where: { estatus_cxc: 'VEN' },
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura'], required: false },
                { model: Remision, attributes: ['id_remision', 'folio_remision'], required: false },
            ],
            order: [['fecha_vencimiento', 'ASC']],
        });
    },

    getById: async (id_cxc: string) => {
        return await Cuenta_Por_Cobrar.findByPk(id_cxc, {
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Facturas, required: false },
                { model: Remision, required: false },
            ],
        });
    },

    create: async (data: ICreateCxC, t: Transaction) => {
        if (!data.id_factura && !data.id_remision) {
            throw new Error('Se requiere id_factura o id_remision para crear una CxC');
        }

        // ── Validación de límite de crédito ──────────────────────────────────
        // Aplica siempre — todos los clientes tienen límite y días de crédito.
        // La deuda es con el cliente real sin importar si la factura es PG o directa.
        const cliente = await Cliente_Almacen.findByPk(data.id_cliente_alm, { transaction: t });
        if (!cliente) throw new Error('Cliente no encontrado');

        const limite = Number(cliente.limite_credito_cliente_alm ?? 0);

        // limite = 0 → sin restricción (clientes internos o sin límite configurado)
        if (limite > 0) {
            const resultado = await Cuenta_Por_Cobrar.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('saldo_pendiente')), 0), 'total_adeudo']],
                where: {
                    id_cliente_alm: data.id_cliente_alm,
                    estatus_cxc: { [Op.in]: ['PEN', 'PAR', 'VEN'] },
                },
                raw: true,
                transaction: t,
            }) as any;

            const adeudo_actual = Number(resultado?.total_adeudo ?? 0);
            const adeudo_nuevo  = adeudo_actual + data.monto_total;

            if (adeudo_nuevo > limite) {
                throw new Error(
                    `Límite de crédito excedido. ` +
                    `Límite: $${limite.toFixed(2)} | ` +
                    `Adeudo actual: $${adeudo_actual.toFixed(2)} | ` +
                    `Nueva factura: $${data.monto_total.toFixed(2)} | ` +
                    `Total resultante: $${adeudo_nuevo.toFixed(2)}`
                );
            }
        }
        // ── Crear CxC ────────────────────────────────────────────────────────
        return await Cuenta_Por_Cobrar.create({
            id_cxc:            uuidv4(),
            id_factura:        data.id_factura  ?? null,
            id_remision:       data.id_remision ?? null,
            id_cliente_alm:    data.id_cliente_alm,
            monto_total:       data.monto_total,
            monto_pagado:      0,
            saldo_pendiente:   data.monto_total,
            fecha_vencimiento: data.fecha_vencimiento,
            dias_credito:      data.dias_credito,
            estatus_cxc:       'PEN',
        }, { transaction: t });
    },

    aplicarPago: async (id_cxc: string, monto_pago: number, t: Transaction) => {
        const cxc = await Cuenta_Por_Cobrar.findByPk(id_cxc, { transaction: t });
        if (!cxc) throw new Error('CxC no encontrada');

        const nuevo_pagado = Number(cxc.monto_pagado) + monto_pago;
        const nuevo_saldo = Number(cxc.monto_total) - nuevo_pagado;
        const estatus_cxc =
            nuevo_saldo <= 0 ? 'PAG' :
                nuevo_pagado > 0 ? 'PAR' : 'PEN';

        return await cxc.update({
            monto_pagado: nuevo_pagado,
            saldo_pendiente: Math.max(nuevo_saldo, 0),
            estatus_cxc,
        }, { transaction: t });
    },

    marcarVencidas: async () => {
        return await Cuenta_Por_Cobrar.update(
            { estatus_cxc: 'VEN' },
            {
                where: {
                    estatus_cxc: { [Op.in]: ['PEN', 'PAR'] },
                    fecha_vencimiento: { [Op.lt]: new Date() },
                    saldo_pendiente: { [Op.gt]: 0 },
                },
            }
        );
    },

    // ── Resumen general (Dashboard) ───────────────────────────────────────────
    getResumenGeneral: async () => {
        const [resumen] = await dbLocal.query<{
            total_cuentas_abiertas: number;
            cuentas_vencidas: number;
            cuentas_parciales: number;
            cuentas_pagadas: number;
            cartera_total: number;
            cartera_vencida: number;
            cartera_vigente: number;
            clientes_con_deuda: number;
            clientes_vencidos: number;
        }>(`
            SELECT
                COUNT(*)           FILTER (WHERE estatus_cxc IN ('PEN','PAR','VEN')) AS total_cuentas_abiertas,
                COUNT(*)           FILTER (WHERE estatus_cxc = 'VEN')                AS cuentas_vencidas,
                COUNT(*)           FILTER (WHERE estatus_cxc = 'PAR')                AS cuentas_parciales,
                COUNT(*)           FILTER (WHERE estatus_cxc = 'PAG')                AS cuentas_pagadas,
                COALESCE(SUM(saldo_pendiente) FILTER (WHERE estatus_cxc IN ('PEN','PAR','VEN')), 0) AS cartera_total,
                COALESCE(SUM(saldo_pendiente) FILTER (WHERE estatus_cxc = 'VEN'),               0) AS cartera_vencida,
                COALESCE(SUM(saldo_pendiente) FILTER (WHERE estatus_cxc IN ('PEN','PAR')),       0) AS cartera_vigente,
                COUNT(DISTINCT id_cliente_alm) FILTER (WHERE estatus_cxc IN ('PEN','PAR','VEN')) AS clientes_con_deuda,
                COUNT(DISTINCT id_cliente_alm) FILTER (WHERE estatus_cxc = 'VEN')                AS clientes_vencidos
            FROM cuenta_por_cobrar
        `, { type: QueryTypes.SELECT });

        const [{ pagos_pendientes_timbrar }] = await dbLocal.query<{ pagos_pendientes_timbrar: number }>(
            `SELECT COUNT(*) AS pagos_pendientes_timbrar FROM factura_pago_cfdi WHERE estatus_timbrado = 'PEN'`,
            { type: QueryTypes.SELECT }
        );

        const [{ pagos_pendientes_aplicar }] = await dbLocal.query<{ pagos_pendientes_aplicar: number }>(
            `SELECT COUNT(*) AS pagos_pendientes_aplicar FROM pago_cxc WHERE estatus_pago = 'CAP'`,
            { type: QueryTypes.SELECT }
        );

        return {
            ...resumen,
            total_cuentas_abiertas:  Number(resumen.total_cuentas_abiertas),
            cuentas_vencidas:        Number(resumen.cuentas_vencidas),
            cuentas_parciales:       Number(resumen.cuentas_parciales),
            cuentas_pagadas:         Number(resumen.cuentas_pagadas),
            cartera_total:           Number(resumen.cartera_total),
            cartera_vencida:         Number(resumen.cartera_vencida),
            cartera_vigente:         Number(resumen.cartera_vigente),
            clientes_con_deuda:      Number(resumen.clientes_con_deuda),
            clientes_vencidos:       Number(resumen.clientes_vencidos),
            pagos_pendientes_timbrar: Number(pagos_pendientes_timbrar),
            pagos_pendientes_aplicar: Number(pagos_pendientes_aplicar),
        };
    },

    // ── Estado de cuenta completo por cliente ─────────────────────────────────
    getEstadoCuenta: async (id_cliente_alm: string, filtros?: { fecha_inicio?: string; fecha_fin?: string }) => {
        const condFecha = filtros?.fecha_inicio && filtros?.fecha_fin
            ? `AND cxc."createdAt"::date BETWEEN :fecha_inicio AND :fecha_fin`
            : filtros?.fecha_inicio
            ? `AND cxc."createdAt"::date >= :fecha_inicio`
            : filtros?.fecha_fin
            ? `AND cxc."createdAt"::date <= :fecha_fin`
            : '';

        const cuentas = await dbLocal.query<{
            id_cxc: string;
            folio_documento: string;
            uuid_sat: string | null;
            fecha_emision: string;
            fecha_vencimiento: string;
            dias_credito: number;
            dias_vencido: number;
            monto_total: number;
            monto_pagado: number;
            saldo_pendiente: number;
            estatus_cxc: string;
            pagos: string;
        }>(`
            SELECT
                cxc.id_cxc,
                COALESCE(f.folio_factura, r.folio_remision::TEXT)   AS folio_documento,
                f.uuid_sat,
                TO_CHAR(cxc."createdAt", 'YYYY-MM-DD')              AS fecha_emision,
                TO_CHAR(cxc.fecha_vencimiento, 'YYYY-MM-DD')        AS fecha_vencimiento,
                cxc.dias_credito,
                GREATEST(CURRENT_DATE - cxc.fecha_vencimiento, 0)   AS dias_vencido,
                cxc.monto_total,
                cxc.monto_pagado,
                cxc.saldo_pendiente,
                cxc.estatus_cxc,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id_pago_cxc',    p.id_pago_cxc,
                            'fecha_pago',     TO_CHAR(p.fecha_pago, 'YYYY-MM-DD'),
                            'monto_pago',     p.monto_pago,
                            'forma_pago',     fp.descripcion,
                            'referencia',     p.referencia_pago,
                            'estatus_pago',   p.estatus_pago,
                            'notas',          p.notas,
                            'capturado_por',  CONCAT(ec.nombre_empleado, ' ', ec.ap_pat_empleado),
                            'aplicado_por',   CONCAT(ea.nombre_empleado, ' ', ea.ap_pat_empleado),
                            'fecha_aplicado', TO_CHAR(p.fecha_aplicado, 'YYYY-MM-DD'),
                            'uuid_cfdi_pago', fpc.uuid_cfdi_pago,
                            'pdf_cfdi',       fpc.pdf_url,
                            'estatus_cfdi',   fpc.estatus_timbrado
                        ) ORDER BY p.fecha_pago
                    ) FILTER (WHERE p.id_pago_cxc IS NOT NULL),
                    '[]'
                ) AS pagos
            FROM cuenta_por_cobrar cxc
            LEFT JOIN facturas            f   ON f.id_factura    = cxc.id_factura
            LEFT JOIN remision            r   ON r.id_remision   = cxc.id_remision
            LEFT JOIN pago_cxc            p   ON p.id_cxc        = cxc.id_cxc
                                              AND p.estatus_pago != 'CAN'
            LEFT JOIN cat_forma_de_pago   fp  ON fp.id_forma_pago = p.id_forma_pago
            LEFT JOIN empleado            ec  ON ec.id_empleado   = p.id_empleado_captura
            LEFT JOIN empleado            ea  ON ea.id_empleado   = p.id_empleado_aplica
            LEFT JOIN factura_pago_cfdi   fpc ON fpc.id_pago_cxc  = p.id_pago_cxc
            WHERE cxc.id_cliente_alm = :id_cliente_alm
            ${condFecha}
            GROUP BY cxc.id_cxc, f.folio_factura, f.uuid_sat, r.folio_remision
            ORDER BY cxc.fecha_vencimiento ASC
        `, {
            replacements: { id_cliente_alm, ...filtros },
            type: QueryTypes.SELECT,
        });

        // Datos del cliente + totales
        const [clienteData] = await dbLocal.query<{
            razon_social_cliente_alm: string;
            nom_corto_cliente_alm: string;
            rfc_cliente_alm: string;
            limite_credito_cliente_alm: number;
        }>(`
            SELECT razon_social_cliente_alm, nom_corto_cliente_alm, rfc_cliente_alm, limite_credito_cliente_alm
            FROM cliente_almacen WHERE id_cliente_alm = :id_cliente_alm
        `, { replacements: { id_cliente_alm }, type: QueryTypes.SELECT });

        const cuentasFormateadas = cuentas.map(c => ({
            ...c,
            monto_total:     Number(c.monto_total),
            monto_pagado:    Number(c.monto_pagado),
            saldo_pendiente: Number(c.saldo_pendiente),
            dias_vencido:    Number(c.dias_vencido),
            pagos: typeof c.pagos === 'string' ? JSON.parse(c.pagos) : c.pagos,
        }));

        const totalCargos  = cuentasFormateadas.reduce((s, c) => s + c.monto_total, 0);
        const totalAbonos  = cuentasFormateadas.reduce((s, c) => s + c.monto_pagado, 0);
        const saldoTotal   = cuentasFormateadas.reduce((s, c) => s + c.saldo_pendiente, 0);

        return {
            cliente: {
                ...clienteData,
                limite_credito_cliente_alm: Number(clienteData?.limite_credito_cliente_alm ?? 0),
            },
            resumen: {
                total_cargos:  +totalCargos.toFixed(2),
                total_abonos:  +totalAbonos.toFixed(2),
                saldo_total:   +saldoTotal.toFixed(2),
                total_cuentas: cuentasFormateadas.length,
                cuentas_vencidas: cuentasFormateadas.filter(c => c.estatus_cxc === 'VEN').length,
            },
            cuentas: cuentasFormateadas,
        };
    },

    // ── Clientes con saldo pendiente y sus CxC individuales ──────────────────
    // id_agente: si se pasa, filtra solo los clientes de ese agente
    getClientesDeudores: async (id_agente?: string) => {
        const filtroAgente = id_agente
            ? `AND ca.id_agente_cliente_alm = :id_agente`
            : '';

        const filas = await dbLocal.query<{
            id_cliente_alm: string;
            razon_social: string;
            nom_corto: string;
            rfc: string;
            total_saldo: number;
            cuentas: string;
        }>(`
            SELECT
                ca.id_cliente_alm,
                ca.razon_social_cliente_alm                         AS razon_social,
                ca.nom_corto_cliente_alm                            AS nom_corto,
                ca.rfc_cliente_alm                                  AS rfc,
                COALESCE(SUM(cxc.saldo_pendiente), 0)               AS total_saldo,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id_cxc',            cxc.id_cxc,
                        'folio_documento',   COALESCE(f.folio_factura, r.folio_remision::TEXT),
                        'monto_total',       cxc.monto_total,
                        'monto_pagado',      cxc.monto_pagado,
                        'saldo_pendiente',   cxc.saldo_pendiente,
                        'saldo_en_revision', COALESCE((SELECT SUM(p2.monto_pago) FROM pago_cxc p2 WHERE p2.id_cxc = cxc.id_cxc AND p2.estatus_pago = 'CAP'), 0),
                        'saldo_disponible',  GREATEST(cxc.saldo_pendiente - COALESCE((SELECT SUM(p2.monto_pago) FROM pago_cxc p2 WHERE p2.id_cxc = cxc.id_cxc AND p2.estatus_pago = 'CAP'), 0), 0),
                        'fecha_vencimiento', TO_CHAR(cxc.fecha_vencimiento, 'YYYY-MM-DD'),
                        'estatus_cxc',       cxc.estatus_cxc
                    ) ORDER BY cxc.fecha_vencimiento
                ) AS cuentas
            FROM cuenta_por_cobrar cxc
            JOIN  cliente_almacen ca ON ca.id_cliente_alm = cxc.id_cliente_alm
            LEFT JOIN facturas     f  ON f.id_factura      = cxc.id_factura
            LEFT JOIN remision     r  ON r.id_remision     = cxc.id_remision
            WHERE cxc.estatus_cxc IN ('PEN', 'PAR', 'VEN')
            ${filtroAgente}
            GROUP BY ca.id_cliente_alm, ca.razon_social_cliente_alm, ca.nom_corto_cliente_alm, ca.rfc_cliente_alm
            ORDER BY total_saldo DESC
        `, {
            replacements: id_agente ? { id_agente } : {},
            type: QueryTypes.SELECT,
        });

        return filas.map(f => ({
            ...f,
            total_saldo: Number(f.total_saldo),
            cuentas: (typeof f.cuentas === 'string' ? JSON.parse(f.cuentas) : f.cuentas).map((c: any) => ({
                ...c,
                monto_total:       Number(c.monto_total),
                monto_pagado:      Number(c.monto_pagado),
                saldo_pendiente:   Number(c.saldo_pendiente),
                saldo_en_revision: Number((c as any).saldo_en_revision ?? 0),
                saldo_disponible:  Number((c as any).saldo_disponible ?? c.saldo_pendiente),
            })),
        }));
    },

    // ── Antigüedad de saldos ──────────────────────────────────────────────────
    getAntiguedadSaldos: async (id_cliente_alm?: string) => {
        const whereClause = id_cliente_alm ? `AND cxc.id_cliente_alm = :id_cliente_alm` : '';

        const filas = await dbLocal.query<{
            id_cliente_alm: string;
            razon_social: string;
            nom_corto: string;
            corriente: number;
            dias_1_30: number;
            dias_31_60: number;
            dias_61_90: number;
            mas_90: number;
            total_saldo: number;
        }>(`
            SELECT
                ca.id_cliente_alm,
                ca.razon_social_cliente_alm                                               AS razon_social,
                ca.nom_corto_cliente_alm                                                  AS nom_corto,
                COALESCE(SUM(cxc.saldo_pendiente)
                    FILTER (WHERE cxc.fecha_vencimiento >= CURRENT_DATE),              0) AS corriente,
                COALESCE(SUM(cxc.saldo_pendiente)
                    FILTER (WHERE CURRENT_DATE - cxc.fecha_vencimiento BETWEEN 1  AND 30),  0) AS dias_1_30,
                COALESCE(SUM(cxc.saldo_pendiente)
                    FILTER (WHERE CURRENT_DATE - cxc.fecha_vencimiento BETWEEN 31 AND 60),  0) AS dias_31_60,
                COALESCE(SUM(cxc.saldo_pendiente)
                    FILTER (WHERE CURRENT_DATE - cxc.fecha_vencimiento BETWEEN 61 AND 90),  0) AS dias_61_90,
                COALESCE(SUM(cxc.saldo_pendiente)
                    FILTER (WHERE CURRENT_DATE - cxc.fecha_vencimiento > 90),              0) AS mas_90,
                COALESCE(SUM(cxc.saldo_pendiente),                                         0) AS total_saldo
            FROM cuenta_por_cobrar cxc
            JOIN cliente_almacen ca ON ca.id_cliente_alm = cxc.id_cliente_alm
            WHERE cxc.estatus_cxc IN ('PEN', 'PAR', 'VEN')
            ${whereClause}
            GROUP BY ca.id_cliente_alm, ca.razon_social_cliente_alm, ca.nom_corto_cliente_alm
            ORDER BY total_saldo DESC
        `, {
            replacements: id_cliente_alm ? { id_cliente_alm } : {},
            type: QueryTypes.SELECT,
        });

        const totales = filas.reduce(
            (acc, f) => ({
                corriente:   acc.corriente   + Number(f.corriente),
                dias_1_30:   acc.dias_1_30   + Number(f.dias_1_30),
                dias_31_60:  acc.dias_31_60  + Number(f.dias_31_60),
                dias_61_90:  acc.dias_61_90  + Number(f.dias_61_90),
                mas_90:      acc.mas_90      + Number(f.mas_90),
                total_saldo: acc.total_saldo + Number(f.total_saldo),
            }),
            { corriente: 0, dias_1_30: 0, dias_31_60: 0, dias_61_90: 0, mas_90: 0, total_saldo: 0 }
        );

        return {
            clientes: filas.map(f => ({
                ...f,
                corriente:   Number(f.corriente),
                dias_1_30:   Number(f.dias_1_30),
                dias_31_60:  Number(f.dias_31_60),
                dias_61_90:  Number(f.dias_61_90),
                mas_90:      Number(f.mas_90),
                total_saldo: Number(f.total_saldo),
            })),
            totales: {
                corriente:   +totales.corriente.toFixed(2),
                dias_1_30:   +totales.dias_1_30.toFixed(2),
                dias_31_60:  +totales.dias_31_60.toFixed(2),
                dias_61_90:  +totales.dias_61_90.toFixed(2),
                mas_90:      +totales.mas_90.toFixed(2),
                total_saldo: +totales.total_saldo.toFixed(2),
            },
        };
    },
};
