import { Request, Response } from 'express';
import { ValeService } from '../services/Vale.service';

export class ValeController {

    static crearVale = async (req: Request, res: Response) => {
        try {
            const vale = await ValeService.crearVale(req.body);
            res.status(201).json(vale);
        } catch (err: any) {
            res.status(400).json({ mensaje: err.message });
        }
    };

    static getValesPorPeriodo = async (req: Request, res: Response) => {
        try {
            const { fecha_inicio, fecha_fin, id_empresa } = req.query as Record<string, string>;
            if (!fecha_inicio || !fecha_fin || !id_empresa) {
                res.status(400).json({ mensaje: 'fecha_inicio, fecha_fin e id_empresa son requeridos' });
                return;
            }
            const vales = await ValeService.getValesPorPeriodo(fecha_inicio, fecha_fin, id_empresa);
            res.json(vales);
        } catch (err: any) {
            console.log(err)
            res.status(500).json({ mensaje: err.message });
        }
    };

    static getDeudaEmpleados = async (req: Request, res: Response) => {
        try {
            const { id_empresa, fecha_inicio, fecha_fin } = req.query as Record<string, string>;
            if (!id_empresa) {
                res.status(400).json({ mensaje: 'id_empresa es requerido' });
                return;
            }
            const deuda = await ValeService.getDeudaEmpleados(id_empresa, fecha_inicio, fecha_fin);
            res.json(deuda);
        } catch (err: any) {
            //console.log(err)
            res.status(500).json({ mensaje: err.message });
        }
    };

    static seedStatusPF = async (_req: Request, res: Response) => {
        try {
            await ValeService.seedStatusPF();
            res.json({ ok: true, mensaje: 'Status PF verificado/creado' });
        } catch (err: any) {
            res.status(500).json({ mensaje: err.message });
        }
    };

    static marcarComoPF = async (req: Request, res: Response) => {
        try {
            const { ids_pedidos } = req.body as { ids_pedidos: string[] };
            const result = await ValeService.marcarComoPF(ids_pedidos);
            res.json(result);
        } catch (err: any) {
            res.status(400).json({ mensaje: err.message });
        }
    };

    static getValesActivosEmpleado = async (req: Request, res: Response) => {
        try {
            const { id_empleado } = req.params;
            const { fecha_inicio, fecha_fin } = req.query as Record<string, string>;
            const vales = await ValeService.getValesActivosEmpleado(id_empleado, fecha_inicio, fecha_fin);
            res.json(vales);
        } catch (err: any) {
            res.status(500).json({ mensaje: err.message });
        }
    };

    static actualizarLimiteCredito = async (req: Request, res: Response) => {
        try {
            const { id_empleado } = req.params;
            const { limite_credito_vale } = req.body;
            if (typeof limite_credito_vale !== 'number' || limite_credito_vale < 0) {
                res.status(400).json({ mensaje: 'limite_credito_vale debe ser un número >= 0' });
                return;
            }
            await ValeService.actualizarLimiteCredito(id_empleado, limite_credito_vale);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ mensaje: err.message });
        }
    };

    static descontarSaldo = async (req: Request, res: Response) => {
        try {
            const { id_empleado } = req.params;
            const { monto } = req.body;
            if (!monto || monto <= 0) {
                res.status(400).json({ mensaje: 'monto debe ser mayor a 0' });
                return;
            }
            const result = await ValeService.descontarSaldo(id_empleado, Number(monto));
            res.json({ ok: true, ...result });
        } catch (err: any) {
            res.status(500).json({ mensaje: err.message });
        }
    };

    static consolidarVales = async (req: Request, res: Response) => {
        try {
            const result = await ValeService.consolidarVales(req.body);
            res.json(result);
        } catch (err: any) {
            console.log(err)
            res.status(400).json({ mensaje: err.message });
        }
    };
}
