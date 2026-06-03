import { v4 as uuidv4 } from 'uuid';
import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Pago_CxC from '../model/Pago_CxC.model';
import Cuenta_Por_Cobrar from '../model/Cuenta_Por_Cobrar.model';
import Cat_Metodo_Pago from '../../../Catalogos/model/Cat_Metodo_Pago';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Empleado from '../../../RRHH/model/Empleado';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Facturas from '../../../Facturas/model/Facturas.model';
import Remision from '../../Remisiones/model/Remision.model';
import { ICapturarPago } from '../interface/CxC.interface';
import FacturaPagoCFDI from '../../../Facturas/model/Factura_Pago_CFDI.model';

export const Pago_CxCRepository = {

    // Paso 1 — Solo guarda el pago como CAP, sin tocar la CxC
    capturar: async (data: ICapturarPago, t: Transaction) => {
        return await Pago_CxC.create({
            id_pago_cxc: uuidv4(),
            id_cxc: data.id_cxc,
            numero_recibo: data.numero_recibo,
            id_metodo_pago: data.id_metodo_pago,
            id_forma_pago: data.id_forma_pago,
            monto_pago: data.monto_pago,
            fecha_pago: data.fecha_pago,
            referencia_pago: data.referencia_pago ?? null,
            id_empleado_captura: data.id_empleado_captura,
            id_empleado_aplica: null,
            fecha_aplicado: null,
            notas: data.notas ?? null,
            estatus_pago: 'CAP',
        }, { transaction: t });
    },

    // Paso 2 — Marca el pago como APL y registra quién lo aplicó y cuándo
    marcarAplicado: async (id_pago_cxc: string, id_empleado_aplica: string, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(
            {
                estatus_pago: 'APL',
                id_empleado_aplica,
                fecha_aplicado: new Date(),
            },
            {
                where: { id_pago_cxc },
                returning: true,
                transaction: t,
            }
        );
        return pago;
    },

    // Pagos capturados pendientes de aplicar — incluye CxC con cliente y factura/remisión
    getPendientesDeAplicar: async () => {
        return await Pago_CxC.findAll({
            where: { estatus_pago: 'CAP' },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc', 'fecha_vencimiento'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm', 'rfc_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'uuid_sat', 'total_factura'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision', 'total_remision'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    // Pagos registrados por un empleado específico (web: vista del agente)
    getMisRecibos: async (id_empleado_captura: string) => {
        return await Pago_CxC.findAll({
            where: { id_empleado_captura },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'uuid_sat'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'DESC']],
        });
    },

    // Pagos aplicados (APL) — para cálculo de comisiones en el frontend.
    // Incluye fecha_vencimiento de la CxC para que el motor pueda determinar si fue anticipado.
    // Filtros opcionales: ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD (sobre fecha_pago)
    getPagosAplicados: async (filtros?: { fecha_inicio?: string; fecha_fin?: string }) => {
        const { Op } = await import('sequelize');

        const where: any = { estatus_pago: 'APL' };
        if (filtros?.fecha_inicio || filtros?.fecha_fin) {
            where.fecha_pago = {};
            if (filtros.fecha_inicio) where.fecha_pago[Op.gte] = new Date(filtros.fecha_inicio);
            if (filtros.fecha_fin)    where.fecha_pago[Op.lte] = new Date(filtros.fecha_fin + 'T23:59:59');
        }

        return await Pago_CxC.findAll({
            where,
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc', 'fecha_vencimiento', 'id_cliente_alm', 'dias_credito'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'total_factura'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision', 'total_remision'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'DESC']],
        });
    },

    // Todos los pagos de una CxC
    getByIdCxC: async (id_cxc: string) => {
        return await Pago_CxC.findAll({
            where: { id_cxc },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                { model: Empleado, foreignKey: 'id_empleado_captura', as: 'empleado_captura', attributes: ['id_empleado', 'nombre_empleado'] },
                { model: Empleado, foreignKey: 'id_empleado_aplica', as: 'empleado_aplica', attributes: ['id_empleado', 'nombre_empleado'] },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    getById: async (id_pago_cxc: string) => {
        return await Pago_CxC.findByPk(id_pago_cxc);
    },

    // Edita campos de un pago CAP (antes de ser aplicado)
    editar: async (id_pago_cxc: string, campos: {
        monto_pago?: number;
        fecha_pago?: Date | string;
        id_forma_pago?: string;
        id_metodo_pago?: string;
        referencia_pago?: string | null;
        notas?: string | null;
        numero_recibo?: string;
    }, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(campos, {
            where: { id_pago_cxc },
            returning: true,
            transaction: t,
        });
        return pago;
    },

    // Cancela un pago que aún no fue aplicado (estatus CAP)
    cancelar: async (id_pago_cxc: string, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(
            { estatus_pago: 'CAN' },
            { where: { id_pago_cxc }, returning: true, transaction: t }
        );
        return pago;
    },

    // Pagos APL que no tienen FacturaPagoCFDI asociado (necesitan timbrado manual)
    // Excluye pagos DEV (generados por devolución) — el CFDI-E ya es su comprobante fiscal.
    getPagosAplicadosSinCFDI: async () => {
        const { Op } = await import('sequelize');

        // IDs de pagos que ya tienen CFDI generado
        const conCFDI = await FacturaPagoCFDI.findAll({
            attributes: ['id_pago_cxc'],
            where: { id_pago_cxc: { [Op.ne]: null } },
        });
        const idsConCFDI = conCFDI.map((c: any) => c.id_pago_cxc).filter(Boolean);

        return await Pago_CxC.findAll({
            where: {
                estatus_pago: 'APL',   // DEV queda excluido explícitamente
                ...(idsConCFDI.length > 0 ? { id_pago_cxc: { [Op.notIn]: idsConCFDI } } : {}),
            },
            include: [
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm', 'rfc_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'uuid_sat', 'total_factura'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision', 'total_remision', 'id_factura'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    // ─── SIGUIENTE CONSECUTIVO DE RECIBO PARA UN AGENTE ──────────────────────────
    //  Busca el mayor consecutivo ya usado con el patrón {cod}_{N} y devuelve N+1.
    //  El regex asegura que solo se consideren filas con formato correcto.
    getSiguienteConsecutivoAgente: async (cod_identi_agente: string): Promise<number> => {
        const rows = await dbLocal.query<{ siguiente: number }>(`
            SELECT COALESCE(
                MAX(CAST(SPLIT_PART(numero_recibo, '_', 2) AS INTEGER)),
                0
            ) + 1 AS siguiente
            FROM pago_cxc
            WHERE numero_recibo ~ :patron
        `, {
            replacements: { patron: `^${cod_identi_agente}_[0-9]+$` },
            type: QueryTypes.SELECT,
        });
        return Number(rows[0]?.siguiente ?? 1);
    },

    // ─── DATOS PARA EL RECIBO DE COBRANZA PDF ────────────────────────────────────
    //  Agrupa todos los pagos de un numero_recibo y devuelve la estructura lista
    //  para pasarla directamente a generarReciboPDFBuffer().
    getDatosRecibo: async (numero_recibo: string) => {
        type RawRow = {
            numero_recibo:  string;
            fecha_emision:  string;
            razon_social:   string;
            nombre_cliente: string;
            ciudad:         string;
            notas:          string | null;
            abonos:         string;   // JSON array devuelto por Postgres
        };

        const rows = await dbLocal.query<RawRow>(`
            SELECT
                p.numero_recibo,
                TO_CHAR(MIN(p.fecha_pago), 'YYYY-MM-DD')                                        AS fecha_emision,
                MAX(ca.razon_social_cliente_alm)                                                  AS razon_social,
                MAX(COALESCE(ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm))              AS nombre_cliente,
                MAX(COALESCE(ciu.nom_ciuda || ', ' || est.nom_esta, ''))                          AS ciudad,
                MIN(p.notas)                                                                      AS notas,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'folio_documento', COALESCE(f.folio_factura, r.folio_remision::TEXT, ''),
                        'valor_documento', cxc.monto_total,
                        'id_forma_pago',   p.id_forma_pago,
                        'referencia_pago', p.referencia_pago,
                        'fecha_deposito',  TO_CHAR(p.fecha_pago, 'YYYY-MM-DD'),
                        'monto',           p.monto_pago
                    ) ORDER BY p.fecha_pago
                ) AS abonos
            FROM pago_cxc          p
            JOIN cuenta_por_cobrar cxc ON cxc.id_cxc          = p.id_cxc
            JOIN cliente_almacen   ca  ON ca.id_cliente_alm   = cxc.id_cliente_alm
            LEFT JOIN colonia       col ON col.id_colonia      = ca.id_colonia_cliente_alm
            LEFT JOIN ciudad        ciu ON ciu.id_ciuda         = col.id_ciuda_colonia
            LEFT JOIN estado        est ON est.id_esta          = ciu.id_esta_ciuda
            LEFT JOIN facturas      f   ON f.id_factura        = cxc.id_factura
            LEFT JOIN remision      r   ON r.id_remision       = cxc.id_remision
            WHERE p.numero_recibo = :numero_recibo
              AND p.estatus_pago != 'CAN'
            GROUP BY p.numero_recibo
        `, {
            replacements: { numero_recibo },
            type: QueryTypes.SELECT,
        });

        if (!rows.length) return null;

        const raw    = rows[0];
        const abonos = (Array.isArray(raw.abonos) ? raw.abonos : JSON.parse(raw.abonos as any))
            .map((a: any) => ({
                folio_documento: String(a.folio_documento ?? ''),
                valor_documento: Number(a.valor_documento),
                id_forma_pago:   String(a.id_forma_pago ?? ''),
                referencia_pago: a.referencia_pago as string | null ?? null,
                fecha_deposito:  String(a.fecha_deposito ?? ''),
                monto:           Number(a.monto),
            }));

        return {
            numero_recibo:  raw.numero_recibo,
            fecha_emision:  raw.fecha_emision,
            razon_social:   raw.razon_social,
            nombre_cliente: raw.nombre_cliente,
            ciudad:         raw.ciudad ?? '',
            notas:          raw.notas ?? null,
            abonos,
        };
    },

    // Historial completo de pagos de una CxC incluyendo datos del CFDI de pago
    getHistorialCxC: async (id_cxc: string) => {
        return await Pago_CxC.findAll({
            where: { id_cxc },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_aplica',
                    as: 'empleado_aplica',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },
};
