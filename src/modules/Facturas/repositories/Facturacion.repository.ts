import { Op, QueryTypes, Transaction, literal } from 'sequelize';
import { dbLocal } from '../../../config/db';
import Facturas from '../model/Facturas.model';
import Detalle_Factura from '../model/Detalle_Factura.model';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import { resolverGrupoPagoP, detectarPublicoGeneral } from '../helpers/factura.helper';
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
        metodo_pago?:    string;   // 'PPD' | 'PUE'
        con_recibo?:     boolean;  // true = solo facturas con un pago/recibo ya registrado
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
        if (filtros.metodo_pago)    where.id_metodo_pago  = filtros.metodo_pago;
        if (filtros.id_cliente_alm) where.id_cliente_alm  = filtros.id_cliente_alm;

        if (filtros.fecha_inicio || filtros.fecha_fin) {
            where.fecha_emision = {};
            if (filtros.fecha_inicio) where.fecha_emision[Op.gte] = new Date(filtros.fecha_inicio);
            if (filtros.fecha_fin)    where.fecha_emision[Op.lte] = new Date(filtros.fecha_fin + 'T23:59:59');
        } else if (!filtros.busqueda && !filtros.con_recibo) {
            // Sin filtros de fecha ni búsqueda → limitar al último mes para no escanear toda la tabla
            const hace30dias = new Date();
            hace30dias.setDate(hace30dias.getDate() - 30);
            where.fecha_emision = { [Op.gte]: hace30dias };
        }

        // Solo facturas que ya tienen un pago/recibo real registrado (pago_cxc), vía su CxC
        // directa o (Público General) vía la CxC de su remisión.
        if (filtros.con_recibo) {
            const idsConRecibo = (await dbLocal.query<{ id_factura: string }>(`
                SELECT DISTINCT f.id_factura
                FROM facturas f
                LEFT JOIN remision r           ON r.id_factura   = f.id_factura
                JOIN cuenta_por_cobrar cxc      ON cxc.id_factura = f.id_factura OR cxc.id_remision = r.id_remision
                JOIN pago_cxc pc                ON pc.id_cxc = cxc.id_cxc AND pc.estatus_pago != 'CAN'
                WHERE f.tipo_cfdi = 'I'
            `, { type: QueryTypes.SELECT })).map(r => r.id_factura);

            where.id_factura = { [Op.in]: idsConRecibo };
        }

        if (filtros.busqueda) {
            where[Op.or] = [
                { folio_factura: { [Op.iLike]: `%${filtros.busqueda}%` } },
                { '$cliente.razon_social_cliente_alm$': { [Op.iLike]: `%${filtros.busqueda}%` } },
                { '$cliente.nom_corto_cliente_alm$':     { [Op.iLike]: `%${filtros.busqueda}%` } },
                { '$cliente.rfc_cliente_alm$':           { [Op.iLike]: `%${filtros.busqueda}%` } },
                { '$pedido.cod_int_pedido_alm$':        { [Op.iLike]: `%${filtros.busqueda}%` } },
            ];
        }

        const { count, rows } = await Facturas.findAndCountAll({
            where,
            include: [
                {
                    model:      Cliente_Almacen,
                    as:         'cliente',
                    attributes: ['razon_social_cliente_alm', 'rfc_cliente_alm', 'nom_corto_cliente_alm'],
                },
                {
                    model:      Pedido_Almacen,
                    as:         'pedido',
                    attributes: ['cod_int_pedido_alm'],
                    required:   false,
                },
            ],
            order:  [[literal('CAST(folio_factura AS INTEGER)'), 'DESC']],
            limit,
            offset,
        });

        // Para el botón "Remisión": qué facturas de Público General siguen sin su remisión
        if (rows.length) {
            const ids = rows.map(r => r.id_factura);

            const conRemision = new Set(
                (await dbLocal.query<{ id_factura: string }>(
                    `SELECT DISTINCT id_factura FROM remision WHERE id_factura IN (:ids)`,
                    { replacements: { ids }, type: QueryTypes.SELECT },
                )).map(r => r.id_factura),
            );

            // Forma de pago real con la que se liquidó (efectivo/transferencia/cheque…), tomada
            // del recibo (pago_cxc) aplicado — no del id_forma_pago de la factura, que solo es
            // la condición configurada en el catálogo del cliente al momento de facturar.
            // La CxC de una factura directa cuelga de facturas.id_factura; la de Público General
            // cuelga de la remisión (remision.id_factura = facturas.id_factura).
            const formaPagoPorFactura = new Map<string, string>();
            (await dbLocal.query<{ id_factura: string; descripcion_forma_de_pago: string }>(`
                SELECT DISTINCT ON (f.id_factura)
                       f.id_factura, cfp.descripcion_forma_de_pago
                FROM facturas f
                LEFT JOIN remision r          ON r.id_factura   = f.id_factura
                LEFT JOIN cuenta_por_cobrar cxc ON cxc.id_factura = f.id_factura OR cxc.id_remision = r.id_remision
                LEFT JOIN pago_cxc pc          ON pc.id_cxc = cxc.id_cxc AND pc.estatus_pago != 'CAN'
                LEFT JOIN cat_forma_de_pago cfp ON cfp.id_forma_de_pago = pc.id_forma_pago
                WHERE f.id_factura IN (:ids)
                ORDER BY f.id_factura, pc.fecha_pago DESC NULLS LAST
            `, { replacements: { ids }, type: QueryTypes.SELECT })).forEach(r => {
                if (r.descripcion_forma_de_pago) formaPagoPorFactura.set(r.id_factura, r.descripcion_forma_de_pago);
            });

            rows.forEach(r => {
                const c: any = (r as any).cliente;
                r.setDataValue('tiene_remision' as any, conRemision.has(r.id_factura) as any);
                r.setDataValue('es_publico_general' as any, detectarPublicoGeneral(c?.rfc_cliente_alm, c?.nom_corto_cliente_alm) as any);
                r.setDataValue('forma_pago_recibo' as any, formaPagoPorFactura.get(r.id_factura) ?? null);
            });
        }

        return { total: count, paginas: Math.ceil(count / limit), page, facturas: rows };
    },

    getCabecera: async (id_pedido_alm: string, id_empresa: string): Promise<DatosFacturacionCabecera> => {
        const rows = await dbLocal.query<DatosFacturacionCabecera>(`
            SELECT
                es.nom_empre,
                es.nom_empre_facturacion,
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
                ca.id_empresa_sys_anterior,
                ca.id_empresa_sys_nuevo,
                COALESCE(ca.tipo_comprobante, 'FAC')                AS tipo_comprobante,
                ca.nom_corto_cliente_alm                            AS nom_empre_receptor,
                ca.calle_cliente_alm                                AS calle_cliente,
                co_ca.nom_colonia                                   AS colonia_cliente,
                ci_ca.nom_ciuda                                     AS municipio_cliente,
                es_ca.nom_esta                                      AS estado_cliente,
                COALESCE(ca.plazo_pago_cliente_alm, 0)              AS plazo_pago_cliente,
                ca.limite_por_factura,
                pa.id_pedido_alm,
                pa.id_cliente_pedido_alm                            AS id_cliente_alm,
                pa.id_agente_pedido_alm                             AS id_agente_alm,
                pa.cod_int_pedido_alm,
                CONCAT(e_ag.nombre_empleado, ' ', e_ag.ap_pat_empleado, ' ', COALESCE(e_ag.ap_mat_empleado, '')) AS nombre_agente,
                (SELECT COALESCE(MAX(NULLIF(regexp_replace(f.folio_factura, '[^0-9]', '', 'g'), '')::INTEGER), 0) + 1 FROM facturas f) AS siguiente_folio
            FROM pedido_almacen         pa
            JOIN empresa_sucursal       es    ON es.id_empre              = :id_empresa
            JOIN colonia                co_es ON co_es.id_colonia         = es.id_colonia_empre
            JOIN cliente_almacen        ca    ON ca.id_cliente_alm        = pa.id_cliente_pedido_alm
            JOIN colonia                co_ca ON co_ca.id_colonia         = ca.id_colonia_cliente_alm
            JOIN ciudad                 ci_ca ON ci_ca.id_ciuda           = co_ca.id_ciuda_colonia
            JOIN estado                 es_ca ON es_ca.id_esta            = ci_ca.id_esta_ciuda
            LEFT JOIN agente_de_venta   av    ON av.id_agente             = pa.id_agente_pedido_alm
            LEFT JOIN empleado          e_ag  ON e_ag.id_empleado         = av.id_empleado
            WHERE pa.id_pedido_alm = :id_pedido_alm
            LIMIT 1
        `, {
            replacements: { id_pedido_alm, id_empresa },
            type: QueryTypes.SELECT,
        });

        if (!rows.length) throw new Error(await FacturacionRepository.explicarFallaCabecera(id_pedido_alm, id_empresa));
        return rows[0];
    },

    // La consulta de cabecera usa JOINs internos: si a UN solo eslabón le falta un dato
    // (cliente, colonia, ciudad, estado, empresa…) no regresa nada y antes solo decía
    // "Pedido no encontrado". Aquí se revisa eslabón por eslabón y se dice cuál falta.
    explicarFallaCabecera: async (id_pedido_alm: string, id_empresa: string): Promise<string> => {
        const [d] = await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm, pa.cod_int_pedido_alm, pa.id_cliente_pedido_alm,
                   ca.id_cliente_alm, ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm,
                   ca.id_colonia_cliente_alm,
                   co_ca.id_colonia AS colonia_cliente, co_ca.id_ciuda_colonia,
                   ci_ca.id_ciuda   AS ciudad_cliente,  ci_ca.id_esta_ciuda,
                   es_ca.id_esta    AS estado_cliente,
                   es.id_empre      AS empresa, es.id_colonia_empre,
                   co_es.id_colonia AS colonia_empresa
            FROM pedido_almacen pa
            LEFT JOIN cliente_almacen ca    ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            LEFT JOIN colonia         co_ca ON co_ca.id_colonia  = ca.id_colonia_cliente_alm
            LEFT JOIN ciudad          ci_ca ON ci_ca.id_ciuda    = co_ca.id_ciuda_colonia
            LEFT JOIN estado          es_ca ON es_ca.id_esta     = ci_ca.id_esta_ciuda
            LEFT JOIN empresa_sucursal es   ON es.id_empre       = :id_empresa
            LEFT JOIN colonia         co_es ON co_es.id_colonia  = es.id_colonia_empre
            WHERE pa.id_pedido_alm = :id_pedido_alm
            LIMIT 1
        `, { replacements: { id_pedido_alm, id_empresa }, type: QueryTypes.SELECT });

        if (!d) return 'Pedido no encontrado para facturación (el pedido no existe).';

        const cliente = (d.nom_corto_cliente_alm || d.razon_social_cliente_alm || '').toString().trim();
        const de = cliente ? ` del cliente "${cliente}"` : '';

        if (!d.id_cliente_pedido_alm) return 'El pedido no tiene cliente asignado.';
        if (!d.id_cliente_alm)        return 'El cliente del pedido ya no existe en el catálogo de clientes.';
        if (!d.id_colonia_cliente_alm) return `Falta la colonia${de}: capturarla en el catálogo de clientes (se necesita para el domicilio fiscal de la factura).`;
        if (!d.colonia_cliente)       return `La colonia${de} ya no existe en el catálogo: vuelve a elegirla en el cliente.`;
        if (!d.ciudad_cliente)        return `La colonia${de} no tiene ciudad asignada en el catálogo de colonias.`;
        if (!d.estado_cliente)        return `La ciudad de la colonia${de} no tiene estado asignado en el catálogo de ciudades.`;
        if (!d.empresa)               return `No se encontró la empresa emisora del usuario (${id_empresa}).`;
        if (!d.id_colonia_empre || !d.colonia_empresa) return 'La empresa emisora no tiene colonia capturada (necesaria para el lugar de expedición).';

        return 'Pedido no encontrado para facturación.';
    },

    // Bitácora de créditos autorizados por un administrador (pedidos facturados por encima del límite)
    getAutorizacionesCredito: async (filtros: { fecha_inicio?: string; fecha_fin?: string }) => {
        const condiciones: string[] = [];
        const replacements: Record<string, any> = {};
        if (filtros.fecha_inicio) { condiciones.push(`ac."createdAt" >= :fecha_inicio`); replacements.fecha_inicio = filtros.fecha_inicio; }
        if (filtros.fecha_fin)    { condiciones.push(`ac."createdAt" <  (:fecha_fin::date + INTERVAL '1 day')`); replacements.fecha_fin = filtros.fecha_fin; }
        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

        return await dbLocal.query(`
            SELECT
                ac.id_autorizacion_credito,
                ac."createdAt"                  AS fecha,
                ac.usuario_autoriza,
                ac.limite_credito, ac.adeudo_previo, ac.monto_documento, ac.excedente,
                pa.id_pedido_alm, pa.cod_int_pedido_alm,
                f.id_factura, f.folio_factura,
                ca.id_cliente_alm, ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm,
                NULLIF(TRIM(CONCAT(es.nombre_empleado, ' ', es.ap_pat_empleado)), '') AS solicito,
                NULLIF(TRIM(CONCAT(ea.nombre_empleado, ' ', ea.ap_pat_empleado)), '') AS nombre_autoriza
            FROM autorizacion_credito ac
            LEFT JOIN pedido_almacen  pa ON pa.id_pedido_alm  = ac.id_pedido_alm
            LEFT JOIN facturas        f  ON f.id_factura      = ac.id_factura
            LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = ac.id_cliente_alm
            LEFT JOIN empleado        es ON es.id_empleado    = ac.id_empleado_solicita
            LEFT JOIN usuario         u  ON u.id_user         = ac.id_usuario_autoriza
            LEFT JOIN empleado        ea ON ea.id_empleado    = u.id_referencia_persona
            ${where}
            ORDER BY ac."createdAt" DESC
            LIMIT 1000
        `, { replacements, type: QueryTypes.SELECT });
    },

    getConceptos: async (id_pedido_alm: string): Promise<ConceptoFacturacion[]> => {
        const rows = await dbLocal.query<{
            id_articulo:     string;
            cod_int_artic:   number;
            necesita_receta: boolean;
            cve_sat:         string; sat_medida: string; desc_medida: string;
            cod_barras:      string; cantidad: number; descripcion: string;
            precio_unitario: number; tasa_iva: number;
            impuesto_sat:  string; tipo_factor: string;
            lotes:         string;
        }>(`
            SELECT
                a.id_artic                                  AS id_articulo,
                a.cod_int_artic,
                a.necesita_receta,
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
                    -- Un mismo lote puede quedar repartido en varias ubicaciones del
                    -- anaquel (varias filas de detalle_pedido_almacen_lote/chequeo) —
                    -- se agrupan por (lote, fecha_venci) para no duplicarlo en el CFDI,
                    -- el PDF ni el reflejo al sistema viejo.
                    SELECT JSON_AGG(JSON_BUILD_OBJECT(
                        'lote',                   sub.lote,
                        'fecha_venci',             sub.fecha_venci,
                        'cantidad',               sub.cantidad,
                        'folio_factura_proveedor', sub.folio_factura_proveedor,
                        'nom_proveedor',           sub.nom_proveedor
                    ))
                    FROM (
                        SELECT
                            COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS lote,
                            TO_CHAR(COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal), 'FMMM/YYYY') AS fecha_venci,
                            SUM(dpac2.cant_chequeada)         AS cantidad,
                            MIN(fcp.folio_factura_proveedor)  AS folio_factura_proveedor,
                            MIN(pr.nomcort_prove)             AS nom_proveedor
                        FROM detalle_pedido_almacen_chequeo dpac2
                        JOIN detalle_pedido_almacen_lote       dpal ON dpal.id_detalle_pedido_almacen_lote = dpac2.id_detalle_pedido_almacen_lote
                        JOIN lote_articulo_sucursal             las  ON las.id_lote_sucursal               = dpal.id_lote_sucursal
                        LEFT JOIN lotes_recibidos_compra        lrc  ON lrc.id_loterecibido                = las.id_loterecibido_lote_sucursal
                        LEFT JOIN detalle_compra_recibido       dcr  ON dcr.id_detcomprec                  = lrc.id_detallecompr_recibido
                        LEFT JOIN detalle_factura_compra_proveedor dfcp ON dfcp.id_factura_proveedor_detalle = dcr.id_detalle_factura_compra_proveedor
                        LEFT JOIN factura_compra_proveedor      fcp  ON fcp.id_factura_proveedor           = dfcp.id_factura_compra_proveedor
                        LEFT JOIN compra_proveedor              cp   ON cp.id_comp                         = fcp.id_compra_prove_factura
                        LEFT JOIN proveedor                     pr   ON pr.id_prove                        = cp.idprove_comp
                        WHERE dpac2.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                          AND dpac2.estado != 'CANCELADO'
                          AND dpac2.cant_chequeada > 0
                        GROUP BY
                            COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal),
                            TO_CHAR(COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal), 'FMMM/YYYY')
                    ) AS sub
                ) AS lotes
            FROM detalle_pedido_almacen dpa
            JOIN pedido_almacen         pa   ON pa.id_pedido_alm              = dpa.id_pedido_almacen
            JOIN articulo               a    ON a.id_artic                    = dpa.id_articulo
            -- LEFT (no INNER): un artículo con catálogo incompleto (sin unidad de medida o
            -- sin tipo de IVA asignado) no debe desaparecer en silencio del pedido — ya se le
            -- descontó stock real, así que se valida abajo y se avisa en vez de omitirlo.
            LEFT JOIN unidadmedida      um   ON um.id_medida                  = a.unidmedi_artic
            LEFT JOIN tipo_iva          ti   ON ti.id_iva                     = a.tipo_de_iva
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

        const incompletos = rows.filter(r => r.cve_sat == null || r.tasa_iva == null || r.sat_medida == null);
        if (incompletos.length) {
            const detalle = incompletos.map(r => `${r.descripcion} (cód. ${r.cod_int_artic})`).join(', ');
            throw new Error(
                `Estos artículos tienen el catálogo incompleto (falta clave SAT, tipo de IVA o unidad de medida) `
                + `y no se pueden facturar/trasladar hasta completarlos: ${detalle}`
            );
        }

        return rows.map(r => {
            const cantidad        = Number(r.cantidad);
            const precio_unitario = Number(r.precio_unitario);
            const tasa_iva        = Number(r.tasa_iva);
            const subtotal_linea  = +(cantidad * precio_unitario).toFixed(2);

            const lotesRaw = Array.isArray(r.lotes)
                ? r.lotes
                : (r.lotes ? JSON.parse(r.lotes as any) : []);

            return {
                ...r,
                cantidad,
                precio_unitario,
                tasa_iva,
                descuento:       0,
                subtotal_linea,
                necesita_receta: Boolean(r.necesita_receta),
                lotes: lotesRaw.map((l: any) => ({
                    lote:                   l.lote,
                    fecha_venci:            l.fecha_venci,
                    cantidad:               Number(l.cantidad),
                    folio_factura_proveedor: l.folio_factura_proveedor ?? null,
                    nom_proveedor:          l.nom_proveedor ?? null,
                })),
            };
        });
    },

    getSiguienteFolio: async (): Promise<number> => {
        const rows = await dbLocal.query<{ siguiente_folio: number }>(
            `SELECT COALESCE(MAX(NULLIF(regexp_replace(f.folio_factura, '[^0-9]', '', 'g'), '')::INTEGER), 0) + 1 AS siguiente_folio FROM facturas f`,
            { type: QueryTypes.SELECT }
        );
        return Number(rows[0]?.siguiente_folio ?? 1);
    },

    getFacturaParaTimbrar: async (id_factura: string): Promise<DatosFacturaParaTimbrar | null> => {
        const rows = await dbLocal.query<{
            id_factura:             string;
            tipo_cfdi:              string;
            estatus_factura:        string;
            uuid_sat:               string | null;
            subtotal_factura:       number;
            iva_factura:            number;
            total_factura:          number;
            id_cliente_alm:         string;
            id_forma_pago:          string;
            folio_factura:          string;
            razon_social_cliente:   string;
            rfc_cliente:            string;
            regimen_fiscal_cliente: string;
            domicilio_fiscal:       string;
            detalles:               string;
        }>(`
            SELECT
                f.id_factura,
                f.tipo_cfdi,
                f.estatus_factura,
                f.uuid_sat,
                f.folio_factura,
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
        folio:                  number;
        tipo_cfdi:              'I' | 'E' | 'T';
        origen_factura?:        string;
        id_pedido_alm?:         string;
        id_cliente_alm:         string;
        id_empresa_facturas?:   string;
        id_metodo_pago?:        string;
        id_forma_pago?:         string;
        uso_cfdi?:              string;
        subtotal:               number;
        iva:                    number;
        total:                  number;
        id_factura_origen?:     string;
        uuid_relacionado?:      string;
        estatus_factura?:       'PEN' | 'GEN';
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
            folio_factura:        String(dto.folio),
            tipo_cfdi:            dto.tipo_cfdi,
            origen_factura:       dto.origen_factura ?? 'PED',
            fecha_emision:        new Date(),
            subtotal_factura:     dto.subtotal,
            iva_factura:          dto.iva,
            total_factura:        dto.total,
            estatus_factura:      dto.estatus_factura ?? 'PEN',
            id_metodo_pago:       dto.id_metodo_pago      ?? null,
            id_forma_pago:        dto.id_forma_pago        ?? null,
            uso_cfdi:             dto.uso_cfdi             ?? null,
            id_empresa_facturas:  dto.id_empresa_facturas  ?? null,
            id_cliente_alm:       dto.id_cliente_alm,
            id_pedido_alm:        dto.id_pedido_alm        ?? null,
            id_factura_origen:    dto.id_factura_origen    ?? null,
            uuid_relacionado:     dto.uuid_relacionado     ?? null,
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

    getById: async (id_factura: string) => {
        const factura = await Facturas.findByPk(id_factura, {
            include: [
                {
                    model: Detalle_Factura,
                    attributes: ['id_detalle_fact', 'descripcion_articulo', 'cantidad_facturada', 'precio_artic', 'subtotal', 'tasa_iva', 'importe_iva'],
                },
                {
                    model: Cliente_Almacen,
                    attributes: ['razon_social_cliente_alm', 'rfc_cliente_alm', 'nom_corto_cliente_alm'],
                },
                {
                    model: Pedido_Almacen,
                    attributes: ['cod_int_pedido_alm'],
                    required: false,
                },
            ],
        });
        if (!factura) return null;

        const f: any = factura.toJSON();
        // La asociación del modelo se llama `detalles` (nombre de la propiedad
        // en Facturas.model.ts) pero el frontend espera `detalle_facturas`
        // (ver IFacturaDetalle en Facturacion.api.ts) — sin este rename, el
        // panel de "Conceptos" siempre salía vacío incluso en facturas tipo I
        // que sí tienen detalle_factura.
        f.detalle_facturas = f.detalles ?? [];
        delete f.detalles;

        const [formaPago] = await dbLocal.query<{ descripcion_forma_de_pago: string }>(`
            SELECT cfp.descripcion_forma_de_pago
            FROM facturas f
            LEFT JOIN remision r          ON r.id_factura   = f.id_factura
            LEFT JOIN cuenta_por_cobrar cxc ON cxc.id_factura = f.id_factura OR cxc.id_remision = r.id_remision
            LEFT JOIN pago_cxc pc          ON pc.id_cxc = cxc.id_cxc AND pc.estatus_pago != 'CAN'
            LEFT JOIN cat_forma_de_pago cfp ON cfp.id_forma_de_pago = pc.id_forma_pago
            WHERE f.id_factura = :id_factura
            ORDER BY pc.fecha_pago DESC NULLS LAST
            LIMIT 1
        `, { replacements: { id_factura }, type: QueryTypes.SELECT });
        f.forma_pago_recibo = formaPago?.descripcion_forma_de_pago ?? null;

        // Tipo P (complemento de pago) no tiene detalle_factura (no son "conceptos"
        // de venta) — en su lugar se arma la lista de facturas que cubrió este pago.
        if (f.tipo_cfdi === 'P') {
            const grupo = await resolverGrupoPagoP({
                id_factura:         f.id_factura,
                id_factura_origen:  f.id_factura_origen,
                id_cliente_alm:     f.id_cliente_alm,
                total_factura:      Number(f.total_factura),
                numero_recibo:      f.numero_recibo,
            });

            f.pagos_relacionados = grupo.length
                ? await dbLocal.query(`
                    SELECT fp.monto_pagado, fp.num_parcialidad, fp.saldo_anterior, fp.saldo_insoluto,
                           fi.folio_factura AS folio_factura_origen
                    FROM factura_pago_cfdi fp
                    JOIN facturas fi ON fi.id_factura = fp.id_factura
                    WHERE fp.id_pago_cfdi IN (:ids)
                    ORDER BY fi.folio_factura
                `, { replacements: { ids: grupo.map(g => g.id_pago_cfdi) }, type: QueryTypes.SELECT })
                : [];
        }

        return f;
    },

    // Forma de pago SAT real (código, ej. '01') con la que se liquidó el CxC de esta
    // factura — viene del recibo (pago_cxc) aplicado, no de un default de catálogo.
    // Se usa para el .txt de Ingreso de Público General, que se genera justo cuando
    // el CxC ya quedó pagado por completo.
    getFormaPagoRealPorFactura: async (id_factura: string): Promise<string | null> => {
        const [row] = await dbLocal.query<{ id_forma_pago: string }>(`
            SELECT pc.id_forma_pago
            FROM facturas f
            LEFT JOIN remision r           ON r.id_factura   = f.id_factura
            LEFT JOIN cuenta_por_cobrar cxc ON cxc.id_factura = f.id_factura OR cxc.id_remision = r.id_remision
            LEFT JOIN pago_cxc pc           ON pc.id_cxc = cxc.id_cxc AND pc.estatus_pago != 'CAN'
            WHERE f.id_factura = :id_factura
            ORDER BY pc.fecha_pago DESC NULLS LAST
            LIMIT 1
        `, { replacements: { id_factura }, type: QueryTypes.SELECT });
        return row?.id_forma_pago ?? null;
    },

    // Folios de la(s) remisión(es) que originaron esta factura (Público General),
    // para armar la leyenda "Factura Generada de Remisión(es) X, Y, Z".
    getFoliosRemisionPorFactura: async (id_factura: string): Promise<number[]> => {
        const rows = await dbLocal.query<{ folio_remision: number }>(`
            SELECT folio_remision FROM remision WHERE id_factura = :id_factura ORDER BY folio_remision
        `, { replacements: { id_factura }, type: QueryTypes.SELECT });
        return rows.map(r => r.folio_remision);
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

    // ── Dashboard ────────────────────────────────────────────────────────────────

    resumenDiario: async (fecha_inicio: string, fecha_fin: string) => {
        const rows = await dbLocal.query<{ fecha: string; total: string; facturas: string }>(`
            SELECT
                fecha_emision::date            AS fecha,
                SUM(total_factura)             AS total,
                COUNT(*)                       AS facturas
            FROM facturas
            WHERE tipo_cfdi = 'I'
              AND estatus_factura IN ('PEN','TIM')
              AND fecha_emision::date BETWEEN :fecha_inicio AND :fecha_fin
            GROUP BY fecha_emision::date
            ORDER BY fecha_emision::date
        `, { replacements: { fecha_inicio, fecha_fin }, type: QueryTypes.SELECT });
        return rows.map(r => ({ fecha: r.fecha, total: Number(r.total), facturas: Number(r.facturas) }));
    },

    topClientes: async (fecha_inicio: string, fecha_fin: string, limite = 10) => {
        const rows = await dbLocal.query<{ id_cliente_alm: string; cliente: string; total: string; facturas: string }>(`
            SELECT
                f.id_cliente_alm,
                ca.nom_corto_cliente_alm       AS cliente,
                SUM(f.total_factura)           AS total,
                COUNT(f.id_factura)            AS facturas
            FROM facturas f
            JOIN cliente_almacen ca ON ca.id_cliente_alm = f.id_cliente_alm
            WHERE f.tipo_cfdi = 'I'
              AND f.estatus_factura IN ('PEN','TIM')
              AND f.fecha_emision::date BETWEEN :fecha_inicio AND :fecha_fin
            GROUP BY f.id_cliente_alm, ca.nom_corto_cliente_alm
            ORDER BY total DESC
            LIMIT :limite
        `, { replacements: { fecha_inicio, fecha_fin, limite }, type: QueryTypes.SELECT });
        return rows.map(r => ({ id_cliente_alm: r.id_cliente_alm, cliente: r.cliente, total: Number(r.total), facturas: Number(r.facturas) }));
    },

    topArticulos: async (fecha_inicio: string, fecha_fin: string, limite = 10) => {
        const rows = await dbLocal.query<{ id_articulo: string; des_artic: string; cantidad: string; total: string }>(`
            SELECT
                df.id_articulo,
                df.descripcion_articulo        AS des_artic,
                SUM(df.cantidad_facturada)     AS cantidad,
                SUM(df.subtotal)               AS total
            FROM detalle_factura df
            JOIN facturas f ON f.id_factura = df.id_factura
            WHERE f.tipo_cfdi = 'I'
              AND f.estatus_factura IN ('PEN','TIM')
              AND f.fecha_emision::date BETWEEN :fecha_inicio AND :fecha_fin
            GROUP BY df.id_articulo, df.descripcion_articulo
            ORDER BY cantidad DESC
            LIMIT :limite
        `, { replacements: { fecha_inicio, fecha_fin, limite }, type: QueryTypes.SELECT });
        return rows.map(r => ({ id_articulo: r.id_articulo, des_artic: r.des_artic, cantidad: Number(r.cantidad), total: Number(r.total) }));
    },
};
