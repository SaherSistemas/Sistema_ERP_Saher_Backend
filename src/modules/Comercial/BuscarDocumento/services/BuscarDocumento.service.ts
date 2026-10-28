import fs from 'fs';
import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Facturas from '../../../Facturas/model/Facturas.model';
import { FacturacionService } from '../../../Facturas/services/Facturacion.service';

const num = (v: unknown) => Number(v ?? 0) || 0;
const error = (status: number, message: string) => Object.assign(new Error(message), { status });

// Buscador de pedidos y facturas para el agente (por folio de pedido, folio de factura o nombre del cliente)
export const BuscarDocumentoService = {

    // El token trae el id del EMPLEADO; se convierte al id del agente. Un usuario que no es agente (administrador) ve todo.
    idAgenteDe: async (id_persona?: string | null): Promise<string | null> => {
        if (!id_persona) return null;
        const [ag] = await dbLocal.query<any>(
            `SELECT id_agente FROM agente_de_venta WHERE id_empleado = :id OR id_agente = :id LIMIT 1`,
            { replacements: { id: id_persona }, type: QueryTypes.SELECT });
        return ag?.id_agente ?? null;
    },

    buscar: async (id_persona: string | null | undefined, texto: string) => {
        const q = String(texto ?? '').trim();
        if (q.length < 2) return [];
        const id_agente = await BuscarDocumentoService.idAgenteDe(id_persona);

        const filas = await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm, pa.cod_int_pedido_alm, pa.status_pedido_alm, cs.descrip_almacen AS status_desc,
                   pa."createdAt" AS fecha_pedido,
                   ca.razon_social_cliente_alm, ca.nom_corto_cliente_alm,
                   f.id_factura, f.folio_factura, f.fecha_emision, f.total_factura, f.estatus_factura,
                   cxc.saldo_pendiente, cxc.estatus_cxc
            FROM pedido_almacen pa
            LEFT JOIN cat_status_pedido_almacen cs ON cs.id_status_pedido_almacen = pa.status_pedido_alm
            LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            LEFT JOIN facturas f ON f.id_pedido_alm = pa.id_pedido_alm AND f.tipo_cfdi = 'I' AND f.estatus_factura <> 'CAN'
            LEFT JOIN cuenta_por_cobrar cxc ON cxc.id_factura = f.id_factura
            WHERE (pa.cod_int_pedido_alm ILIKE :q OR f.folio_factura ILIKE :q
                   OR ca.razon_social_cliente_alm ILIKE :q OR ca.nom_corto_cliente_alm ILIKE :q)
              ${id_agente ? 'AND pa.id_agente_pedido_alm = :ag' : ''}
            ORDER BY pa."createdAt" DESC
            LIMIT 40`,
            { replacements: { q: `%${q}%`, ag: id_agente }, type: QueryTypes.SELECT });

        // Un pedido con varias facturas viene en varias filas: se junta
        const porPedido = new Map<string, any>();
        for (const f of filas) {
            let p = porPedido.get(f.id_pedido_alm);
            if (!p) {
                p = {
                    id_pedido_alm: f.id_pedido_alm,
                    cod_int_pedido_alm: f.cod_int_pedido_alm,
                    status: f.status_pedido_alm,
                    status_desc: f.status_desc ?? f.status_pedido_alm,
                    fecha_pedido: f.fecha_pedido,
                    cliente: String(f.razon_social_cliente_alm ?? '').trim(),
                    nombre_corto: String(f.nom_corto_cliente_alm ?? '').trim(),
                    facturas: [] as any[],
                };
                porPedido.set(f.id_pedido_alm, p);
            }
            if (f.id_factura && !p.facturas.some((x: any) => x.id_factura === f.id_factura)) {
                p.facturas.push({
                    id_factura: f.id_factura,
                    folio_factura: f.folio_factura,
                    fecha_emision: f.fecha_emision,
                    total_factura: num(f.total_factura),
                    estatus_factura: f.estatus_factura,
                    saldo_pendiente: f.saldo_pendiente == null ? null : num(f.saldo_pendiente),
                    estatus_cxc: f.estatus_cxc ?? null,
                });
            }
        }
        return Array.from(porPedido.values());
    },

    // Artículos del pedido: lo pedido, lo surtido y lo negado
    detalle: async (id_persona: string | null | undefined, id_pedido_alm: string) => {
        const id_agente = await BuscarDocumentoService.idAgenteDe(id_persona);
        const [pedido] = await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm, pa.status_pedido_alm, pa.id_agente_pedido_alm
            FROM pedido_almacen pa WHERE pa.id_pedido_alm = :id`,
            { replacements: { id: id_pedido_alm }, type: QueryTypes.SELECT });
        if (!pedido) throw error(404, 'Pedido no encontrado.');
        if (id_agente && pedido.id_agente_pedido_alm !== id_agente) throw error(403, 'Este pedido no es de tus clientes.');

        const items = await dbLocal.query<any>(`
            SELECT a.cod_int_artic, a.cod_barr_artic, a.des_artic, dpa.cant_pedida, dpa.precio_venta,
                   COALESCE((SELECT SUM(l.cantidad) FROM detalle_pedido_almacen_lote l
                             WHERE l.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen), 0) AS surtida,
                   COALESCE((SELECT SUM(n.cantidad_negada) FROM detalle_pedido_negado n
                             WHERE n.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen AND n.recuperado = false), 0) AS negada
            FROM detalle_pedido_almacen dpa
            JOIN articulo a ON a.id_artic = dpa.id_articulo
            WHERE dpa.id_pedido_almacen = :id
            ORDER BY a.des_artic ASC`,
            { replacements: { id: id_pedido_alm }, type: QueryTypes.SELECT });

        return {
            id_pedido_alm,
            // Antes del chequeo lo "surtido" todavía es lo apartado, no lo que realmente salió
            surtido_terminado: ['CH', 'EM', 'FA', 'EN'].includes(pedido.status_pedido_alm),
            items: items.map(i => ({
                cod_int_artic: i.cod_int_artic,
                cod_barr_artic: i.cod_barr_artic ?? null,
                des_artic: i.des_artic,
                cant_pedida: num(i.cant_pedida),
                precio_venta: num(i.precio_venta),
                surtida: num(i.surtida),
                // Nunca más de lo que falta por surtir (por si quedaron negaciones duplicadas)
                negada: Math.min(num(i.negada), Math.max(0, num(i.cant_pedida) - num(i.surtida))),
            })),
        };
    },

    // Factura del agente (o cualquiera si no es agente) para bajar su PDF / XML
    facturaDelAgente: async (id_persona: string | null | undefined, id_factura: string) => {
        const id_agente = await BuscarDocumentoService.idAgenteDe(id_persona);
        const [f] = await dbLocal.query<any>(`
            SELECT f.id_factura, pa.id_agente_pedido_alm
            FROM facturas f
            LEFT JOIN pedido_almacen pa ON pa.id_pedido_alm = f.id_pedido_alm
            WHERE f.id_factura = :id`,
            { replacements: { id: id_factura }, type: QueryTypes.SELECT });
        if (!f) throw error(404, 'Factura no encontrada.');
        if (id_agente && f.id_agente_pedido_alm !== id_agente) throw error(403, 'Esta factura no es de tus clientes.');
        const factura = await Facturas.findByPk(id_factura);
        if (!factura) throw error(404, 'Factura no encontrada.');
        return factura;
    },

    pdf: async (id_persona: string | null | undefined, id_factura: string) => {
        const factura = await BuscarDocumentoService.facturaDelAgente(id_persona, id_factura);
        const nombre = `factura-${factura.folio_factura}.pdf`;
        if (factura.pdf_url && fs.existsSync(factura.pdf_url)) return { nombre, buffer: fs.readFileSync(factura.pdf_url) };
        // Si no está el PDF en disco pero sí el XML timbrado, se regenera desde el XML
        if (factura.xml_url && fs.existsSync(factura.xml_url)) {
            const { buffer } = await FacturacionService.generarPdfDetalleSAT(id_factura);
            return { nombre, buffer };
        }
        throw error(404, 'Esta factura todavía no tiene PDF generado.');
    },

    xml: async (id_persona: string | null | undefined, id_factura: string) => {
        const factura = await BuscarDocumentoService.facturaDelAgente(id_persona, id_factura);
        if (!factura.xml_url || !fs.existsSync(factura.xml_url)) throw error(404, 'Esta factura todavía no tiene XML timbrado.');
        return { nombre: `factura-${factura.folio_factura}.xml`, buffer: fs.readFileSync(factura.xml_url) };
    },
};
