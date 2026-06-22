import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { InventarioService } from '../services/Inventario.service';
import { io } from '../../../../server_ws';

export const InventarioController = {

    getLista: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = req.user.id_empresa;
            const { status, tipo, fecha_inicio, fecha_fin } = req.query as Record<string, string>;
            const data = await InventarioService.getLista(id_empresa, { status: status as any, tipo: tipo as any, fecha_inicio, fecha_fin });
            res.json(data);
        } catch (e: any) {
            res.status(500).json({ mensaje: e.message });
        }
    },

    getById: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await InventarioService.getById(req.params.id);
            if (!data) { res.status(404).json({ mensaje: 'No encontrado' }); return; }
            res.json(data);
        } catch (e: any) {
            res.status(500).json({ mensaje: e.message });
        }
    },

    crear: async (req: AuthedRequest, res: Response) => {
        try {
            const { tipo_inventario, filtro, notas } = req.body;
            if (!tipo_inventario) { res.status(400).json({ mensaje: 'tipo_inventario requerido' }); return; }
            const data = await InventarioService.crear({
                id_empresa_sucursal: req.user.id_empresa,
                tipo_inventario,
                filtro,
                creado_por: req.user.id_referencia_persona,
                notas,
            });
            res.status(201).json(data);
        } catch (e: any) {
            res.status(500).json({ mensaje: e.message });
        }
    },

    actualizarConteo: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_detalle } = req.params;
            const { cant_contada, comentario, ajustar } = req.body;
            if (cant_contada === undefined || cant_contada === null) {
                res.status(400).json({ mensaje: 'cant_contada requerida' }); return;
            }
            const data = await InventarioService.actualizarConteo(id_detalle, { cant_contada: Number(cant_contada), comentario, ajustar });

            // Notificar a todos los surtidores en el mismo inventario
            const id_inventario = (data as any)?.id_inventario;
            if (id_inventario) {
                io.to(`inventario:${id_inventario}`).emit('conteo_actualizado', {
                    id_detalle_inventario: id_detalle,
                    cant_contada: Number(cant_contada),
                    contado: true,
                    actualizado_por: req.user?.username ?? 'Surtidor',
                });
            }

            res.json(data);
        } catch (e: any) {
            res.status(500).json({ mensaje: e.message });
        }
    },

    crearRandom: async (req: AuthedRequest, res: Response) => {
        try {
            const { cantidad, notas } = req.body;
            if (!cantidad || isNaN(Number(cantidad))) {
                res.status(400).json({ mensaje: 'cantidad requerida (número)' }); return;
            }
            const data = await InventarioService.crearRandom({
                id_empresa_sucursal: req.user.id_empresa,
                cantidad:            Number(cantidad),
                creado_por:          req.user.id_referencia_persona,
                notas,
            });
            res.status(201).json(data);
        } catch (e: any) {
            res.status(500).json({ mensaje: e.message });
        }
    },

    iniciar: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await InventarioService.iniciar(req.params.id);
            res.json(data);
        } catch (e: any) {
            res.status(400).json({ mensaje: e.message });
        }
    },

    terminar: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await InventarioService.terminar(req.params.id);
            res.json(data);
        } catch (e: any) {
            res.status(400).json({ mensaje: e.message });
        }
    },

    terminarForzado: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await InventarioService.terminarForzado(req.params.id);
            res.json(data);
        } catch (e: any) {
            res.status(400).json({ mensaje: e.message });
        }
    },

    aplicar: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await InventarioService.aplicar(req.params.id, req.user.id_referencia_persona);
            res.json(data);
        } catch (e: any) {
            res.status(400).json({ mensaje: e.message });
        }
    },

    cancelar: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await InventarioService.cancelar(req.params.id);
            res.json(data);
        } catch (e: any) {
            res.status(400).json({ mensaje: e.message });
        }
    },
};
