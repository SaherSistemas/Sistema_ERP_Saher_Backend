import fs from 'fs';
import type { Response } from 'express';
import type { AuthedRequest } from '../../../middleware/auth';
import { FacturacionService } from '../services/Facturacion.service';
import { FacturacionRepository } from '../repositories/Facturacion.repository';
import Facturas from '../model/Facturas.model';

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

    static getList = async (req: AuthedRequest, res: Response) => {
        try {
            const { estatus, tipo_cfdi, id_cliente_alm, busqueda, fecha_inicio, fecha_fin, page, limit } = req.query as any;
            const resultado = await FacturacionRepository.getList({ estatus, tipo_cfdi, id_cliente_alm, busqueda, fecha_inicio, fecha_fin, page, limit });
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
            const id_empresa  = req.user?.id_empresa;
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
            const { id_cliente_real } = req.body ?? {};
            const id_empresa  = req.user?.id_empresa;
            const id_empleado = req.user?.id_referencia_persona ?? '';
            const resultado = await FacturacionService.timbrarIngreso({ id_pedido_alm, id_empresa, id_cliente_real, id_empleado });
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

            const resultado = await FacturacionService.timbrarEgreso({ id_factura_origen, detalles });
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
            });

            res.status(201).json(resultado);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error?.message ?? 'Error desconocido' });
        }
    };
}
