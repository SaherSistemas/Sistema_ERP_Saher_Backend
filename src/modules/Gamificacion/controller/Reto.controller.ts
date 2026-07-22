import { Request, Response } from 'express';
import { RetoService } from '../service/Reto.service';

export const RetoController = {

    getAll: async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.query as any;
            if (!id_empresa) { res.status(400).json({ message: 'id_empresa requerido' }); return; }
            const data = await RetoService.getAll(id_empresa);
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error al obtener retos', error: e }); }
    },

    getMisRetos: async (req: Request, res: Response) => {
        try {
            const { id_empleado, id_empresa, id_corte, fecha_dia } = req.query as any;
            if (!id_empleado || !id_empresa || !id_corte || !fecha_dia) {
                res.status(400).json({ message: 'Faltan parámetros' }); return;
            }
            const data = await RetoService.getMisRetos(id_empleado, id_empresa, id_corte, fecha_dia);
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error al obtener mis retos', error: e }); }
    },

    create: async (req: Request, res: Response) => {
        try {
            const reto = await RetoService.create(req.body);
            res.status(201).json(reto);
        } catch (e) {
            console.log(e)
            res.status(500).json({ message: 'Error al crear reto', error: e });

        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const reto = await RetoService.update(id, req.body);
            res.json(reto);
        } catch (e) { res.status(500).json({ message: 'Error al actualizar reto', error: e }); }
    },

    toggleActivo: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const reto = await RetoService.toggleActivo(id);
            res.json(reto);
        } catch (e) { res.status(500).json({ message: 'Error al cambiar estado del reto', error: e }); }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await RetoService.delete(id);
            res.json({ message: 'Reto eliminado' });
        } catch (e) { res.status(500).json({ message: 'Error al eliminar reto', error: e }); }
    },

    actualizarProgreso: async (req: Request, res: Response) => {
        try {
            const result = await RetoService.actualizarProgresoVenta(req.body);
            res.json(result);
        } catch (e) { res.status(500).json({ message: 'Error al actualizar progreso', error: e }); }
    },

    getPuntosTotales: async (req: Request, res: Response) => {
        try {
            const { id_empleado } = req.params;
            const puntos = await RetoService.getPuntosTotales(id_empleado);
            res.json({ puntos: puntos ?? 0 });
        } catch (e) { res.status(500).json({ message: 'Error al obtener puntos', error: e }); }
    },

    getHistorialLogros: async (req: Request, res: Response) => {
        try {
            const { id_empleado } = req.params;
            const logros = await RetoService.getHistorialLogros(id_empleado);
            res.json(logros);
        } catch (e) { res.status(500).json({ message: 'Error al obtener historial', error: e }); }
    },
};
