import { Op, QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../config/db';
import Facturas from '../model/Facturas.model';
import Detalle_Factura from '../model/Detalle_Factura.model';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import {
    DatosFacturacionCabecera,
    ConceptoFacturacion,
    DetalleParaEgreso,
    DatosFacturaParaTimbrar,
} from '../interfaces/Facturacion.types';

export type { DatosFacturacionCabecera, ConceptoFacturacion, DetalleParaEgreso, DatosFacturaParaTimbrar };

export const FacturacionRepository = {

    getList: async (filtros: {
        estatus?:        string;
        tipo_cfdi?:      string;
        id_cliente_alm?: string;
        busqueda?:       string;
        fecha_inicio?:   string;
        fecha_fin?:      string;
        page?:           number;
        limit?:          number;
    }) => {
        const page   = Number(filtros.page  ?? 1);
        const limit  = Number(filtros.limit ?? 50);
        const offset = (page - 1) * limit;

        const where: any = {};
        if (filtros.estatus)        where.estatus_factura = filtros.estatus;
        if (filtros.tipo_cfdi)      where.tipo_cfdi       = filtros.tipo_cfdi;
        if (filtros.id_cliente_alm) where.id_cliente_alm  = filtros.id_cliente_alm;
        if (filtros.fecha_inicio || filtros.fecha_fin) {
            where.fecha_emision = {};
            if (filtros.fecha_inicio) where.fecha_emision[Op.gte] = new Date(filtros.fecha_inicio);
            if (filtros.fecha_fin)    where.fecha_emision[Op.lte] = new Date(filtros.fecha_fin + 'T23:59:59');
        }
        if (filtros.busqueda) {
            where[Op.or] = [
                { folio_factura: { [Op.iLike]: `%${filtros.busqueda}%` } },
            ];
        }

        const { count, rows } = await Facturas.findAndCountAll({
            where,
            include: [
                {
                    model:      Cliente_Almacen,
                    as:         'cliente',
                    attributes: ['razon_social_cliente_alm', 'rfc_cliente_alm'],
                },
                {
                    model:      Pedido_Almacen,
                    as:         'pedido',
                    attributes: ['cod_int_pedido_alm'],
                    required:   false,
                },
            ],
            order:  [['fecha_emision', 'DESC']],
            limit,
            offset,
        });

        return { total: count, paginas: Math.ceil(count / limit), page, facturas: rows };
    },

    getCabecera: async (id_pedido_alm: string, id_empresa: string): Promise<DatosFacturacionCabecera> => {
        const rows = await dbLocal.query<DatosFacturacionCabecera>(`
            SELECT
                es.nom_empre,
                es.rfc_empre,
                COALESCE(es.regimen_fiscal_empre,    '601') AS regimen_fiscal_empre,
                COALESCE(es.serie_facturacion_empre, 'FSH') AS serie_facturacion_empre,
                es.leyenda_factura_empre,
                co_es.cp_colonia                                    AS lugar_expedicion,
                ca.razon_social_cliente_alm                         AS razon_social_cliente,
                ca.rfc_cliente_alm                                  AS rfc_cliente,
                co_ca.cp_colonia                                    AS domicilio_fiscal,
                ca.id_regimen_fiscal_cliente_alm                    AS regimen_fiscal_cliente,
                ca.uso_cfdi_cliente_alm                             AS uso_cfdi,
                ca.id_forma_pago_cliente_alm                        AS forma_pago,
                ca.id_metodo_pago_cliente_alm                       AS metodo_pago,
                COALESCE(ca.plazo_pago_cliente_alm, 0)              AS plazo_pago_cliente,
                ca.limite_por_factura,
                pa.id_pedido_alm,
                pa.id_cliente_pedido_alm                            AS id_cliente_alm,
                pa.id_agente_pedido_alm                             AS id_agente_alm,
                pa.cod_int_pedido_alm,
                CONCAT(e_ag.nombre_empleado, ' ', e_ag.ap_pat_empleado, ' ', COALESCE(e_ag.ap_mat_empleado, '')) AS nombre_agente,
                (SELECT COALESCE(MAX(f.folio_factura::INTEGER), 0) + 1 FROM facturas f) AS siguiente_folio
            FROM pedido_almacen         pa
            JOIN empresa_sucursal       es    ON es.id_empre              = :id_empresa
            JOIN colonia                co_es ON co_es.id_colonia         = es.id_colonia_empre
            JOIN cliente_almacen        ca    ON ca.id_cliente_alm        = pa.id_cliente_pedido_alm
            JOIN colonia                co_ca ON co_ca.id_colonia         = ca.id_colonia_cliente_alm
            LEFT JOIN agente_de_venta   av    ON av.id_agente             = pa.id_agente_pedido_alm
            LEFT JOIN empleado          e_ag  ON e_ag.id_empleado         = av.id_empleado
            WHERE pa.id_pedido_alm = :id_pedido_alm
            LIMIT 1
        `, {
            replacements: { id_pedido_alm, id_empresa },
            type: QueryTypes.SELECT,
        });

        if (!rows.length) throw new Error('Pedido no encontrado para facturación');
        return rows[0];
    },

    getConceptos: async (id_pedido_alm: string): Promise<ConceptoFacturacion[]> => {
        const rows = await dbLocal.query<{
            id_articulo:   string;
            cve_sat:       string; sat_medida: string; desc_medida: string;
            cod_barras:    string; cantidad: number; descripcion: string;
            precio_unitario: number; tasa_iva: number;
            impuesto_sat:  string; tipo_factor: string;
            lotes:         string;
        }>(`
            SELECT
                a.id_artic                                  AS id_articulo,
                a.satclave_artic                            AS cve_sat,
                um.sat_medida,
                um.descrip_medida                           AS desc_medida,
                a.cod_barr_artic                            AS cod_barras,
                COALESCE(SUM(dpac.cant_chequeada), 0)       AS cantidad,
                a.des_artic                                 AS descripcion,
                dpa.precio_venta                            AS precio_unitario,
                CAST(ti.porcentaje_iva AS NUMERIC)          AS tasa_iva,
                ti.impuesto_sat,
                ti.tipo_factor,
                (
                    SELECT JSON_AGG(JSON_BUILD_OBJECT(
                        'lote',        COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal),
                        'fecha_venci', TO_CHAR(COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal), 'FMMM/YYYY'),
                        'cantidad',    dpac2.cant_chequeada
                    ))
                    FROM detalle_pedido_almacen_chequeo dpac2
                    JOIN detalle_pedido_almacen_lote    dpal ON dpal.id_detalle_pedido_almacen_lote = dpac2.id_detalle_pedido_almacen_lote
                    JOIN lote_articulo_sucursal         las  ON las.id_lote_sucursal = dpal.id_lote_sucursal
                    WHERE dpac2.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                      AND dpac2.estado != 'CANCELADO'
                      AND dpac2.cant_chequeada > 0
                ) AS lotes
            FROM detalle_pedido_almacen dpa
            JOIN pedido_almacen         pa   ON pa.id_pedido_alm              = dpa.id_pedido_almacen
            JOIN articulo               a    ON a.id_artic                    = dpa.id_articulo
            JOIN unidadmedida           um   ON um.id_medida                  = a.unidmedi_artic
            JOIN tipo_iva               ti   ON ti.id_iva                     = a.tipo_de_iva
            LEFT JOIN detalle_pedido_almacen_chequeo dpac
                ON dpac.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
               AND dpac.estado != 'CANCELADO'
            WHERE pa.id_pedido_alm = :id_pedido_alm
            GROUP BY
                dpa.id_detalle_pedido_almacen,
                a.id_artic, a.satclave_artic, a.cod_barr_artic, a.des_artic,
                um.sat_medida, um.descrip_medida,
                dpa.precio_venta,
                ti.porcentaje_iva, ti.impuesto_sat, ti.tipo_factor
            HAVING COALESCE(SUM(dpac.cant_chequeada), 0) > 0
            ORDER BY dpa.id_detalle_pedido_almacen
        `, {
            replacements: { id_pedido_alm },
            type: QueryTypes.SELECT,
        });

        return rows.map(r => {
            const cantidad        = Number(r.cantidad);
            const precio_unitario = Number(r.precio_unitario);
            const tasa_iva        = Number(r.tasa_iva);
            const subtotal_linea  = +(cantidad * precio_unitario).toFixed(2);

            return {
                ...r,
                cantidad,
                precio_unitario,
                tasa_iva,
                descuento:    0,
                subtotal_linea,
                lotes: Array.isArray(r.lotes)
                    ? r.lotes.map((l: any) => ({ ...l, cantidad: Number(l.cantidad) }))
                    : (r.lotes ? JSON.parse(r.lotes as any) : []),
            };
        });
    },

    getSiguienteFolio: async (): Promise<number> => {
        const rows = await dbLocal.query<{ siguiente_folio: number }>(
            `SELECT COALESCE(MAX(f.folio_factura::INTEGER), 0) + 1 AS siguiente_folio FROM facturas f`,
            { type: QueryTypes.SELECT }
        );
        return Number(rows[0]?.siguiente_folio ?? 1);
    },

    getFacturaParaTimbrar: async (id_factura: string): Promise<DatosFacturaParaTimbrar | null> => {
        const rows = await dbLocal.query<{
            id_factura:             string;
            tipo_cfdi:              string;
            uuid_sat:               string | null;
            subtotal_factura:       number;
            iva_factura:            number;
            total_factura:          number;
            id_cliente_alm:         string;
            id_forma_pago:          string;
            razon_social_cliente:   string;
            rfc_cliente:            string;
            regimen_fiscal_cliente: string;
            domicilio_fiscal:       string;
            detalles:               string;
        }>(`
            SELECT
                f.id_factura,
                f.tipo_cfdi,
                f.uuid_sat,
                f.subtotal_factura,
                f.iva_factura,
                f.total_factura,
                f.id_cliente_alm,
                f.id_forma_pago,
                ca.razon_social_cliente_alm AS razon_social_cliente,
                ca.rfc_cliente_alm          AS rfc_cliente,
                ca.id_regimen_fiscal_cliente_alm AS regimen_fiscal_cliente,
                co.cp_colonia               AS domicilio_fiscal,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id_articulo',         df.id_articulo,
                        'descripcion_articulo', df.descripcion_articulo,
                        'cantidad_facturada',   df.cantidad_facturada,
                        'precio_artic',         df.precio_artic,
                        'subtotal',             df.subtotal,
                        'tasa_iva',             df.tasa_iva,
                        'cve_sat',              a.satclave_artic,
                        'sat_medida',           um.sat_medida,
                        'desc_medida',          um.descrip_medida
                    )
                ) AS detalles
            FROM facturas f
            JOIN cliente_almacen ca ON ca.id_cliente_alm = f.id_cliente_alm
            JOIN colonia         co ON co.id_colonia     = ca.id_colonia_cliente_alm
            LEFT JOIN detalle_factura df ON df.id_factura  = f.id_factura
            LEFT JOIN articulo        a  ON a.id_artic     = df.id_articulo
            LEFT JOIN unidadmedida    um ON um.id_medida   = a.unidmedi_artic
            WHERE f.id_factura = :id_factura
            GROUP BY f.id_factura, ca.razon_social_cliente_alm, ca.rfc_cliente_alm,
                     ca.id_regimen_fiscal_cliente_alm, co.cp_colonia
        `, {
            replacements: { id_factura },
            type: QueryTypes.SELECT,
        });

        if (!rows.length) return null;

        const r        = rows[0];
        const detalles = (
            Array.isArray(r.detalles) ? r.detalles : JSON.parse(r.detalles as any)
        ).map((d: any) => ({
            ...d,
            cantidad_facturada: Number(d.cantidad_facturada),
            precio_artic:       Number(d.precio_artic),
            subtotal:           Number(d.subtotal),
            tasa_iva:           Number(d.tasa_iva),
        })) as DetalleParaEgreso[];

        return {
            ...r,
            subtotal_factura: Number(r.subtotal_factura),
            iva_factura:      Number(r.iva_factura),
            total_factura:    Number(r.total_factura),
            detalles,
        };
    },

    registrarFactura: async (dto: {
        folio:              number;
        tipo_cfdi:          'I' | 'E';
        origen_factura?:    string;
        id_pedido_alm?:     string;
        id_cliente_alm:     string;
        id_metodo_pago?:    string;
        id_forma_pago?:     string;
        uso_cfdi?:          string;
        subtotal:           number;
        iva:                number;
        total:              number;
        id_factura_origen?: string;
        uuid_relacionado?:  string;
        conceptos: Array<{
            id_articulo:     string;
            descripcion:     string;
            cantidad:        number;
            precio_unitario: number;
            subtotal_linea:  number;
            tasa_iva:        number;
        }>;
    }, t: Transaction) => {
        const factura = await Facturas.create({
            folio_factura:     String(dto.folio),
            tipo_cfdi:         dto.tipo_cfdi,
            origen_factura:    dto.origen_factura ?? 'PED',
            fecha_emision:     new Date(),
            subtotal_factura:  dto.subtotal,
            iva_factura:       dto.iva,
            total_factura:     dto.total,
            estatus_factura:   'PEN',
            id_metodo_pago:    dto.id_metodo_pago    ?? null,
            id_forma_pago:     dto.id_forma_pago      ?? null,
            uso_cfdi:          dto.uso_cfdi           ?? null,
            id_cliente_alm:    dto.id_cliente_alm,
            id_pedido_alm:     dto.id_pedido_alm      ?? null,
            id_factura_origen: dto.id_factura_origen  ?? null,
            uuid_relacionado:  dto.uuid_relacionado   ?? null,
        }, { transaction: t });

        await Detalle_Factura.bulkCreate(
            dto.conceptos.map(c => ({
                id_factura:           factura.id_factura,
                id_articulo:          c.id_articulo,
                descripcion_articulo: c.descripcion,
                cantidad_facturada:   c.cantidad,
                precio_artic:         c.precio_unitario,
                subtotal:             c.subtotal_linea,
                tasa_iva:             c.tasa_iva,
                importe_iva:          +(c.subtotal_linea * c.tasa_iva).toFixed(2),
            })),
            { transaction: t }
        );

        return factura;
    },

    actualizarTimbrado: async (id_factura: string, data: {
        uuid_sat:       string;
        fecha_timbrado: Date;
        pdf_url:        string;
        xml_url:        string;
    }) => {
        await Facturas.update({
            uuid_sat:        data.uuid_sat,
            fecha_timbrado:  data.fecha_timbrado,
            pdf_url:         data.pdf_url,
            xml_url:         data.xml_url,
            estatus_factura: 'TIM',
            estatus_sat:     'vigente',
        }, { where: { id_factura } });
    },
};
