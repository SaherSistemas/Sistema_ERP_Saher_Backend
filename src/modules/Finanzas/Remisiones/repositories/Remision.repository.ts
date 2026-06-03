import { v4 as uuidv4 } from 'uuid';
import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Remision from '../model/Remision.model';
import Detalle_Remision from '../model/Detalle_Remision.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Facturas from '../../../Facturas/model/Facturas.model';
import Pedido_Almacen from '../../../Almacen/Pedido/model/Pedido_Almacen';

interface ICreateRemisionRepo {
    id_factura: string;
    id_pedido_alm: string;
    id_cliente_alm: string;   // resuelto por el service desde el pedido
    id_agente: string;        // resuelto por el service desde el pedido
    dias_credito: number;
    subtotal_remision: number;
    iva_remision: number;
    total_remision: number;
    notas?: string;
}

export const RemisionRepository = {

    getAll: async () => {
        return await Remision.findAll({
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Agente_de_Venta, attributes: ['id_agente', 'cod_identi_agente'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'] },
                { model: Pedido_Almacen, attributes: ['id_pedido_alm', 'cod_int_pedido_alm'] },
            ],
            order: [['fecha_remision', 'DESC']],
        });
    },

    getByCliente: async (id_cliente_alm: string) => {
        return await Remision.findAll({
            where: { id_cliente_alm },
            include: [
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'uuid_sat'] },
                { model: Pedido_Almacen, attributes: ['id_pedido_alm', 'cod_int_pedido_alm'] },
                { model: Agente_de_Venta, attributes: ['id_agente', 'cod_identi_agente'] },
            ],
            order: [['fecha_remision', 'DESC']],
        });
    },

    getByIdConDetalles: async (id_remision: string) => {
        return await Remision.findByPk(id_remision, {
            include: [
                { model: Cliente_Almacen, attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'] },
                { model: Agente_de_Venta, attributes: ['id_agente', 'cod_identi_agente'] },
                { model: Facturas, attributes: ['id_factura', 'folio_factura', 'estatus_factura', 'uuid_sat'] },
                { model: Pedido_Almacen, attributes: ['id_pedido_alm', 'cod_int_pedido_alm'] },
                { model: Detalle_Remision },
            ],
        });
    },

    create: async (data: ICreateRemisionRepo, folio: number, t: Transaction) => {
        const fecha_remision    = new Date();
        const fecha_vencimiento = new Date();
        fecha_vencimiento.setDate(fecha_vencimiento.getDate() + data.dias_credito);

        return await Remision.create({
            id_remision:       uuidv4(),
            folio_remision:    folio,
            id_factura:        data.id_factura,
            id_pedido_alm:     data.id_pedido_alm,
            id_cliente_alm:    data.id_cliente_alm,
            id_agente:         data.id_agente,
            fecha_remision,
            dias_credito:      data.dias_credito,
            fecha_vencimiento,
            subtotal_remision: data.subtotal_remision,
            iva_remision:      data.iva_remision,
            total_remision:    data.total_remision,
            estatus_remision:  'PEN',
            notas:             data.notas ?? null,
        }, { transaction: t });
    },

    getUltimoFolio: async (): Promise<number> => {
        const ultima = await Remision.findOne({ order: [['folio_remision', 'DESC']] });
        return ultima ? ultima.folio_remision + 1 : 1;
    },

    // ─── Datos para el PDF de remisión ────────────────────────────────────────
    getDatosParaPDF: async (id_remision: string) => {
        type RawRow = {
            folio_remision:       number;
            fecha_emision:        string;   // DD/MM/YY
            dia_venc:             string;
            mes_venc:             string;
            anio_venc:            string;
            dias_credito:         number;
            subtotal_remision:    number;
            iva_remision:         number;
            total_remision:       number;
            estatus_remision:     string;
            notas:                string | null;
            razon_social_cliente_alm: string;
            rfc_cliente_alm:          string | null;
            calle_receptor:           string;
            colonia_receptor:         string;
            cp_receptor:              string;
            municipio_receptor:       string;
            estado_receptor:          string;
            cod_identi_agente:    string;
            nombre_agente:        string | null;
            cod_int_pedido_alm:   string | null;
            folio_factura:        string | null;
            detalles:             string;
        };

        const rows = await dbLocal.query<RawRow>(`
            SELECT
                r.folio_remision,
                TO_CHAR(r.fecha_remision,    'DD/MM/YY')   AS fecha_emision,
                TO_CHAR(r.fecha_vencimiento, 'DD')          AS dia_venc,
                TO_CHAR(r.fecha_vencimiento, 'MM')          AS mes_venc,
                TO_CHAR(r.fecha_vencimiento, 'YYYY')        AS anio_venc,
                r.dias_credito,
                r.subtotal_remision,
                r.iva_remision,
                r.total_remision,
                r.estatus_remision,
                r.notas,
                ca.razon_social_cliente_alm,
                ca.rfc_cliente_alm,
                COALESCE(ca.calle_cliente_alm, '')                                     AS calle_receptor,
                COALESCE(col.nom_colonia, col.cp_colonia, '')                          AS colonia_receptor,
                COALESCE(col.cp_colonia, '')                                           AS cp_receptor,
                COALESCE(ciu.nom_ciuda, '')                                            AS municipio_receptor,
                COALESCE(est.nom_esta, '')                                             AS estado_receptor,
                av.cod_identi_agente,
                CONCAT(e.nombre_empleado, ' ', e.ap_pat_empleado)                     AS nombre_agente,
                pa.cod_int_pedido_alm,
                f.folio_factura,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'descripcion_articulo', dr.descripcion_articulo,
                            'cantidad',             dr.cantidad,
                            'precio_unitario',      dr.precio_unitario,
                            'subtotal',             dr.subtotal,
                            'tasa_iva',             dr.tasa_iva,
                            'importe_iva',          dr.importe_iva,
                            'cod_barras',           COALESCE(a.cod_barr_artic, ''),
                            'unidad',               COALESCE(um.descrip_medida, 'PZA')
                        ) ORDER BY dr.id_detalle_remision
                    ) FILTER (WHERE dr.id_detalle_remision IS NOT NULL),
                    '[]'::json
                ) AS detalles
            FROM remision           r
            JOIN  cliente_almacen   ca  ON ca.id_cliente_alm    = r.id_cliente_alm
            JOIN  agente_de_venta   av  ON av.id_agente          = r.id_agente
            LEFT JOIN empleado      e   ON e.id_empleado         = av.id_empleado
            LEFT JOIN pedido_almacen pa ON pa.id_pedido_alm      = r.id_pedido_alm
            LEFT JOIN facturas      f   ON f.id_factura           = r.id_factura
            LEFT JOIN colonia       col ON col.id_colonia         = ca.id_colonia_cliente_alm
            LEFT JOIN ciudad        ciu ON ciu.id_ciuda           = col.id_ciuda_colonia
            LEFT JOIN estado        est ON est.id_esta            = ciu.id_esta_ciuda
            LEFT JOIN detalle_remision dr ON dr.id_remision       = r.id_remision
            LEFT JOIN articulo      a   ON a.id_artic             = dr.id_articulo
            LEFT JOIN unidadmedida  um  ON um.id_medida           = a.unidmedi_artic
            WHERE r.id_remision = :id_remision
            GROUP BY
                r.id_remision, r.folio_remision, r.fecha_remision,
                r.dias_credito, r.fecha_vencimiento,
                r.subtotal_remision, r.iva_remision, r.total_remision,
                r.estatus_remision, r.notas,
                ca.razon_social_cliente_alm, ca.rfc_cliente_alm, ca.calle_cliente_alm,
                col.nom_colonia, col.cp_colonia,
                ciu.nom_ciuda, est.nom_esta,
                av.cod_identi_agente, e.nombre_empleado, e.ap_pat_empleado,
                pa.cod_int_pedido_alm, f.folio_factura
        `, { replacements: { id_remision }, type: QueryTypes.SELECT });

        if (!rows.length) return null;

        const r = rows[0];
        const detalles = (Array.isArray(r.detalles) ? r.detalles : JSON.parse(r.detalles as any))
            .map((d: any) => ({
                descripcion_articulo: String(d.descripcion_articulo ?? ''),
                cantidad:             Number(d.cantidad),
                precio_unitario:      Number(d.precio_unitario),
                subtotal:             Number(d.subtotal),
                tasa_iva:             Number(d.tasa_iva),
                importe_iva:          Number(d.importe_iva),
                cod_barras:           String(d.cod_barras ?? ''),
                unidad:               String(d.unidad ?? 'PZA'),
            }));

        return {
            folio_remision:       Number(r.folio_remision),
            fecha_emision:        r.fecha_emision,
            dia_venc:             r.dia_venc,
            mes_venc:             r.mes_venc,
            anio_venc:            r.anio_venc,
            dias_credito:         Number(r.dias_credito),
            subtotal_remision:    Number(r.subtotal_remision),
            iva_remision:         Number(r.iva_remision),
            total_remision:       Number(r.total_remision),
            estatus_remision:     r.estatus_remision,
            notas:                r.notas ?? null,
            razon_social_cliente: r.razon_social_cliente_alm,
            rfc_cliente:          r.rfc_cliente_alm ?? null,
            calle_receptor:       r.calle_receptor ?? '',
            colonia_receptor:     r.colonia_receptor ?? '',
            cp_receptor:          r.cp_receptor ?? '',
            municipio_receptor:   r.municipio_receptor ?? '',
            estado_receptor:      r.estado_receptor ?? '',
            cod_identi_agente:    r.cod_identi_agente,
            nombre_agente:        r.nombre_agente ?? null,
            cod_int_pedido:       r.cod_int_pedido_alm ?? null,
            folio_factura:        r.folio_factura ?? null,
            detalles,
        };
    },

    actualizarEstatus: async (id_remision: string, estatus_remision: string, t?: Transaction) => {
        return await Remision.update(
            { estatus_remision },
            { where: { id_remision }, transaction: t }
        );
    },
};
