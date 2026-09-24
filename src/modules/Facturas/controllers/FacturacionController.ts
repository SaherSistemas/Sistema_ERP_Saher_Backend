import fs from 'fs';
import type { Request, Response } from 'express';
import type { AuthedRequest } from '../../../middleware/auth';
import { FacturacionService } from '../services/Facturacion.service';
import { FacturacionRepository } from '../repositories/Facturacion.repository';
import Facturas from '../model/Facturas.model';
import { dbLocal } from '../../../config/db';
import { QueryTypes } from 'sequelize';
import { CxCService } from '../../Finanzas/Cuentas_Por_Cobrar/services/CxC.service';

export class FacturacionController {

    static reintentarTimbrado = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const id_empresa = req.user?.id_empresa;
            const resultado = await FacturacionService.reintentarTimbrado(id_factura, id_empresa);
            res.json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    static reinsertarEnPolyDB = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const resultado = await FacturacionService.reinsertarEnPolyDB(id_factura);
            res.json(resultado);
        } catch (error: any) {
            console.error('[reinsertarEnPolyDB]', error);
            const status = error?.status ?? 500;
            res.status(status).json({ message: error?.message ?? 'Error al reinsertar en PolyDB.' });
        }
    };

    // POST /api/facturas/:id_factura/remision
    // Crea la remisión faltante de una factura de Público General (el PDF se ve/descarga desde el front)
    static generarRemision = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const r = await FacturacionService.generarRemisionFactura(id_factura);
            res.status(201).json(r);
        } catch (error: any) {
            console.error('[generarRemision]', error);
            res.status(400).json({ message: error?.message ?? 'No se pudo generar la remisión.' });
        }
    };

    // POST /api/facturas/:id_factura/deshacer
    // Deshace la facturación de un pedido aún sin timbrar (mercancía al stock, borra factura/remisión/CxC)
    static deshacerFacturacion = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const { liberar_stock, usuario_admin, password_admin } = req.body ?? {};
            const r = await FacturacionService.deshacerFacturacion(id_factura, req.user?.id_empresa as string, {
                liberar_stock: !!liberar_stock, usuario_admin, password_admin,
                id_empleado: req.user?.id_referencia_persona,
            });
            res.json(r);
        } catch (error: any) {
            console.error('[deshacerFacturacion]', error);
            res.status(400).json({ message: error?.message ?? 'No se pudo deshacer la facturación.' });
        }
    };

    // POST /api/facturas/:id_factura/traspaso-pdf
    // Genera la hoja de traspaso de un traslado (tipo T) y la regresa como PDF
    static generarTraspasoPdf = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const id_empresa = req.user?.id_empresa;
            const { buffer, nombre } = await FacturacionService.generarHojaTraspaso(id_factura, id_empresa);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
            res.send(buffer);
        } catch (error: any) {
            console.error('[generarTraspasoPdf]', error);
            res.status(400).json({ message: error?.message ?? 'No se pudo generar la hoja de traspaso.' });
        }
    };

    // POST /api/facturas/:id_factura/pdf-sat
    // PDF con detalle SAT por renglón (Clave SAT + Clave de Unidad SAT), para clientes que lo requieren
    static generarPdfDetalleSAT = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const { buffer, nombre } = await FacturacionService.generarPdfDetalleSAT(id_factura);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
            res.send(buffer);
        } catch (error: any) {
            console.error('[generarPdfDetalleSAT]', error);
            res.status(400).json({ message: error?.message ?? 'No se pudo generar el detalle SAT.' });
        }
    };

    // GET /api/facturas/autorizaciones-credito?fecha_inicio=&fecha_fin=
    // Pedidos facturados por encima del límite de crédito con autorización de un administrador
    static getAutorizacionesCredito = async (req: AuthedRequest, res: Response) => {
        try {
            const { fecha_inicio, fecha_fin } = req.query as Record<string, string>;
            const filas = await FacturacionRepository.getAutorizacionesCredito({ fecha_inicio, fecha_fin });
            res.json({ autorizaciones: filas });
        } catch (error: any) {
            console.error('[getAutorizacionesCredito]', error);
            res.status(500).json({ message: error?.message ?? 'Error al consultar las autorizaciones.' });
        }
    };

    static getLotesByFactura = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const factura = await Facturas.findByPk(id_factura, { attributes: ['id_pedido_alm'] });
            if (!factura) { res.status(404).json({ message: 'Factura no encontrada' }); return; }
            // Un mismo lote puede estar repartido en varias ubicaciones del anaquel
            // (varias filas de detalle_pedido_almacen_lote) — se agrupan aquí para
            // mostrar una sola fila por (artículo, lote) con la cantidad sumada.
            const lotes = await dbLocal.query<any>(`
                SELECT
                    dpa.id_articulo,
                    a.des_artic,
                    a.cod_barr_artic,
                    las.numero_lote_sucursal AS lote,
                    TO_CHAR(las.fecha_venci_lote_sucursal, 'MM/YYYY') AS fecha_venci,
                    SUM(dpal.cantidad) AS cantidad
                FROM detalle_pedido_almacen_lote dpal
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
                JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = dpal.id_lote_sucursal
                JOIN articulo a ON a.id_artic = dpa.id_articulo
                WHERE dpa.id_pedido_almacen = :id_pedido_alm
                GROUP BY dpa.id_articulo, a.des_artic, a.cod_barr_artic, las.numero_lote_sucursal, las.fecha_venci_lote_sucursal
                ORDER BY a.des_artic, las.numero_lote_sucursal
            `, { type: QueryTypes.SELECT, replacements: { id_pedido_alm: (factura as any).id_pedido_alm } });
            res.json(lotes);
        } catch (error: any) {
            console.error('[getLotesByFactura]', error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    static getById = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const factura = await FacturacionRepository.getById(id_factura);
            if (!factura) res.status(404).json({ message: 'Factura no encontrada' });
            res.json(factura);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    static getList = async (req: AuthedRequest, res: Response) => {
        try {
            const { estatus, tipo_cfdi, metodo_pago, con_recibo, id_cliente_alm, busqueda, fecha_inicio, fecha_fin, page, limit } = req.query as any;
            const resultado = await FacturacionRepository.getList({
                estatus, tipo_cfdi, metodo_pago, id_cliente_alm, busqueda, fecha_inicio, fecha_fin, page, limit,
                con_recibo: con_recibo === 'true' || con_recibo === '1',
            });
            res.json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    // Legado: genera .txt para timbrado manual
    static generarTxt = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_pedido_alm } = req.params;
            const id_empresa = req.user?.id_empresa;
            const id_empleado = req.user?.id_referencia_persona ?? '';
            const resultado = await FacturacionService.generarTxt({ id_pedido_alm, id_empresa, id_empleado });
            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    // Timbra un Ingreso directamente con Facturapi desde un pedido
    static timbrarIngreso = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_pedido_alm } = req.params;
            const { id_cliente_real, forzar_credito, usuario_admin, password_admin } = req.body ?? {};
            const id_empresa = req.user?.id_empresa;
            const id_empleado = req.user?.id_referencia_persona ?? '';
            console.log('[timbrarIngreso] id_pedido_alm:', id_pedido_alm, '| id_empresa del token:', id_empresa);
            const resultado = await FacturacionService.timbrarIngreso({ id_pedido_alm, id_empresa, id_cliente_real, id_empleado, forzar_credito, usuario_admin, password_admin });
            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    // Crea y timbra un Egreso (Nota de Crédito) referenciando una factura Ingreso timbrada
    static timbrarEgreso = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura_origen, detalles } = req.body as {
                id_factura_origen: string;
                detalles: { id_articulo: string; cantidad: number }[];
            };

            if (!id_factura_origen) {
                res.status(400).json({ message: 'id_factura_origen es requerido' });
            }
            if (!detalles?.length) {
                res.status(400).json({ message: 'detalles es requerido y debe contener al menos un artículo' });
            }

            const id_empresa = req.user?.id_empresa;
            const resultado = await FacturacionService.timbrarEgreso({ id_factura_origen, detalles, id_empresa });
            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    // Descarga el PDF de un traslado (tipo T, estatus GEN)
    static descargarTrasladoPdf = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const factura = await Facturas.findByPk(id_factura);
            if (!factura) {
                res.status(404).json({ message: 'Factura no encontrada' });
                return;
            }
            if (factura.tipo_cfdi !== 'T') {
                res.status(400).json({ message: 'Esta factura no es un traslado' });
                return;
            }
            if (!factura.pdf_url || !fs.existsSync(factura.pdf_url)) {
                res.status(404).json({ message: 'El PDF del traslado no existe en el servidor' });
                return;
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="TRA_${factura.folio_factura}.pdf"`);
            fs.createReadStream(factura.pdf_url).pipe(res);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    // Crea y timbra un Complemento de Pago referenciando una factura Ingreso timbrada
    static timbrarPago = async (req: AuthedRequest, res: Response) => {
        try {
            const {
                id_factura,
                fecha_pago,
                id_forma_pago,
                monto_pago,
                num_parcialidad,
                saldo_anterior,
                moneda,
                id_pago_cxc,
            } = req.body;

            if (!id_factura || !fecha_pago || !id_forma_pago || monto_pago == null || num_parcialidad == null || saldo_anterior == null) {
                res.status(400).json({
                    message: 'Campos requeridos: id_factura, fecha_pago, id_forma_pago, monto_pago, num_parcialidad, saldo_anterior',
                });
            }

            const resultado = await FacturacionService.timbrarPago({
                id_factura,
                fecha_pago,
                id_forma_pago,
                monto_pago: Number(monto_pago),
                num_parcialidad: Number(num_parcialidad),
                saldo_anterior: Number(saldo_anterior),
                moneda,
                id_pago_cxc,
                id_empresa: req.user?.id_empresa,
            });

            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    // ── Dashboard ────────────────────────────────────────────────────────────────

    // Recibe el XML timbrado por el facturador externo, genera el PDF y actualiza la factura
    // Body: { xml: "<cfdi:Comprobante...>" } (texto del XML)
    // POST /api/facturas/recibir-xml/:id_factura
    static recibirXml = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const xml: string = req.body?.xml ?? (typeof req.body === 'string' ? req.body : '');
            if (!xml || !xml.includes('cfdi:Comprobante')) {
                res.status(400).json({ message: 'Se requiere el campo "xml" con el contenido del CFDI timbrado' });
                return;
            }
            const resultado = await FacturacionService.recibirXml(id_factura, xml);
            res.json(resultado);
        } catch (error: any) {
            console.error('[recibirXml]', error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };

    static resumenDiario = async (req: Request, res: Response) => {
        try {
            const { fecha_inicio, fecha_fin } = req.query as Record<string, string>;
            if (!fecha_inicio || !fecha_fin) { res.status(400).json({ message: 'fecha_inicio y fecha_fin requeridos' }); return; }
            const data = await FacturacionRepository.resumenDiario(fecha_inicio, fecha_fin);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    static topClientes = async (req: Request, res: Response) => {
        try {
            const { fecha_inicio, fecha_fin, limite } = req.query as Record<string, string>;
            if (!fecha_inicio || !fecha_fin) { res.status(400).json({ message: 'fecha_inicio y fecha_fin requeridos' }); return; }
            const data = await FacturacionRepository.topClientes(fecha_inicio, fecha_fin, Number(limite ?? 10));
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    static topArticulos = async (req: Request, res: Response) => {
        try {
            const { fecha_inicio, fecha_fin, limite } = req.query as Record<string, string>;
            if (!fecha_inicio || !fecha_fin) { res.status(400).json({ message: 'fecha_inicio y fecha_fin requeridos' }); return; }
            const data = await FacturacionRepository.topArticulos(fecha_inicio, fecha_fin, Number(limite ?? 10));
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    // POST /api/facturas/regenerar-txt-pago/:id_factura
    // Regenera el TXT de complemento de pago sin consumir nuevo folio.
    // Limpia uuid_cfdi_pago y regresa estatus a PEN para retimbrado.
    // El matching (1 factura vs. recibo multi-factura) vive en el servicio —
    // ver CxCService.regenerarTxtPagoCFDI.
    static regenerarTxtPago = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_factura } = req.params;
            const id_empresa = req.user?.id_empresa;

            const resultado = await CxCService.regenerarTxtPagoCFDI(id_factura, id_empresa);
            res.json({ ok: true, ruta: resultado.ruta });
        } catch (error: any) {
            console.error('Error regenerarTxtPago:', error);
            const noEncontrado = /no encontrad/i.test(error?.message ?? '');
            res.status(noEncontrado ? 404 : 500).json({ message: error.message ?? 'Error al regenerar TXT.' });
        }
    };
}
