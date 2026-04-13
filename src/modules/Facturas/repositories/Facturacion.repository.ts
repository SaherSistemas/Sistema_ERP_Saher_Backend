import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../config/db';
import Facturas from '../model/Facturas.model';
import Detalle_Factura from '../model/Detalle_Factura.model';

export interface DatosFacturacionCabecera {
    // Emisor
    nom_empre: string;
    rfc_empre: string;
    regimen_fiscal_empre: string;
    serie_facturacion_empre: string;
    leyenda_factura_empre: string | null;
    lugar_expedicion: string;
    // Receptor
    razon_social_cliente: string;
    rfc_cliente: string;
    domicilio_fiscal: string;
    regimen_fiscal_cliente: string;
    uso_cfdi: string;
    forma_pago: string;
    metodo_pago: string;
    // Pedido
    id_pedido_alm: string;
    id_cliente_alm: string;
    cod_int_pedido_alm: string;
    nombre_agente: string | null;
    // Folio
    siguiente_folio: number;
}

export interface ConceptoFacturacion {
    cve_sat: string;
    sat_medida: string;
    desc_medida: string;
    cod_barras: string;
    cantidad: number;
    descripcion: string;
    precio_unitario: number;
    descuento: number;
    subtotal_linea: number;
    tasa_iva: number;          // 0.16 | 0.00
    impuesto_sat: string;      // '002'
    tipo_factor: string;       // 'Tasa'
    lotes: { lote: string; fecha_venci: string; cantidad: number }[];
}

export const FacturacionRepository = {

    getCabecera: async (id_pedido_alm: string, id_empresa: string): Promise<DatosFacturacionCabecera> => {
        const rows = await dbLocal.query<DatosFacturacionCabecera>(`
            SELECT
                es.nom_empre,
                es.rfc_empre,
                COALESCE(es.regimen_fiscal_empre,  '601') AS regimen_fiscal_empre,
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
                pa.id_pedido_alm,
                pa.id_cliente_pedido_alm                            AS id_cliente_alm,
                pa.cod_int_pedido_alm,
                CONCAT(e_ag.nombre_empleado, ' ', e_ag.ap_pat_empleado, ' ', COALESCE(e_ag.ap_mat_empleado, '')) AS nombre_agente,
                (SELECT COALESCE(MAX(f.folio_factura), 0) + 1 FROM facturas f) AS siguiente_folio
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
            cve_sat: string; sat_medida: string; desc_medida: string;
            cod_barras: string; cantidad: number; descripcion: string;
            precio_unitario: number; tasa_iva: number;
            impuesto_sat: string; tipo_factor: string;
            lotes: string;
        }>(`
            SELECT
                a.satclave_artic                    AS cve_sat,
                um.sat_medida,
                um.descrip_medida                   AS desc_medida,
                a.cod_barr_artic                    AS cod_barras,
                dpa.cant_pedida                     AS cantidad,
                a.des_artic                         AS descripcion,
                dpa.precio_venta                    AS precio_unitario,
                CAST(ti.porcentaje_iva AS NUMERIC)  AS tasa_iva,
                ti.impuesto_sat,
                ti.tipo_factor,
                (
                    SELECT JSON_AGG(JSON_BUILD_OBJECT(
                        'lote',        las.numero_lote_sucursal,
                        'fecha_venci', TO_CHAR(las.fecha_venci_lote_sucursal, 'FMMM/YYYY'),
                        'cantidad',    dpal.cantidad
                    ))
                    FROM detalle_pedido_almacen_lote dpal
                    JOIN lote_articulo_sucursal      las ON las.id_lote_sucursal = dpal.id_lote_sucursal
                    WHERE dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                ) AS lotes
            FROM detalle_pedido_almacen dpa
            JOIN pedido_almacen         pa  ON pa.id_pedido_alm   = dpa.id_pedido_almacen
            JOIN articulo               a   ON a.id_artic         = dpa.id_articulo
            JOIN unidadmedida           um  ON um.id_medida        = a.unidmedi_artic
            JOIN tipo_iva               ti  ON ti.id_iva           = a.tipo_de_iva
            WHERE pa.id_pedido_alm = :id_pedido_alm
            ORDER BY dpa.id_detalle_pedido_almacen
        `, {
            replacements: { id_pedido_alm },
            type: QueryTypes.SELECT,
        });

        return rows.map(r => ({
            ...r,
            descuento: 0,
            subtotal_linea: Number(r.cantidad) * Number(r.precio_unitario),
            tasa_iva: Number(r.tasa_iva) / 100,   // porcentaje_iva viene como 16.00 → 0.16
            lotes: r.lotes ? JSON.parse(r.lotes as any) : [],
        }));
    },

    registrarFactura: async (dto: {
        folio: number;
        id_pedido_alm: string;
        id_cliente_alm: string;
        id_metodo_pago: string;
        id_forma_pago: string;
        uso_cfdi: string;
        subtotal: number;
        iva: number;
        conceptos: ConceptoFacturacion[];
    }) => {
        return await dbLocal.transaction(async t => {
            const factura = await Facturas.create({
                folio_factura:    dto.folio,
                fecha_emision:    new Date(),
                subtotal_factura: dto.subtotal,
                iva_factura:      dto.iva,
                estatus_factura:  'PEN',
                id_metodo_pago:   dto.id_metodo_pago,
                id_forma_pago:    dto.id_forma_pago,
                uso_cfdi:         dto.uso_cfdi,
                id_cliente_alm:   dto.id_cliente_alm,
                id_pedido_alm:    dto.id_pedido_alm,
            }, { transaction: t });

            await Detalle_Factura.bulkCreate(
                dto.conceptos.map(c => ({
                    id_factura:            factura.id_factura,
                    id_articulo:           null,           // no tenemos el id aquí, se puede añadir si se necesita
                    descripcion_articulo:  c.descripcion,
                    cantidad_facturada:    c.cantidad,
                    precio_artic:          c.precio_unitario,
                    subtotal:              c.subtotal_linea,
                    tasa_iva:              c.tasa_iva,
                    importe_iva:           +(c.subtotal_linea * c.tasa_iva).toFixed(2),
                })),
                { transaction: t }
            );

            return factura;
        });
    },
};
