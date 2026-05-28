import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { KardexService } from '../services/Kardex.service';

export const KardexController = {

    crearMovimiento: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || req.body.id_empresa || '').trim();
            const id_empleado = String(req.user?.id_referencia_persona || req.body.id_empleado || '').trim();

            if (!id_empresa) {
                res.status(400).json({ ok: false, message: 'id_empresa requerido' });
                return;
            }
            if (!id_empleado) {
                res.status(400).json({ ok: false, message: 'id_empleado requerido' });
                return;
            }

            const data = { ...req.body, id_empresa, id_empleado };
            const resultado = await KardexService.crear(data);

            res.status(201).json({ ok: true, data: resultado });
        } catch (e: any) {
            console.error('[KardexController.crearMovimiento]', e);
            if (res.headersSent) return;
            res.status(400).json({ ok: false, message: e.message ?? 'Error al crear movimiento' });
        }
    },

    obtenerMovimientos: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || req.query.id_empresa || '').trim();
            const id_articulo = String(req.query.id_articulo || '').trim() || undefined;
            const tipo_movimiento = String(req.query.tipo_movimiento || '').trim() || undefined;
            const categoria = String(req.query.categoria || '').trim() || undefined;
            const fecha_inicio = String(req.query.fecha_inicio || '').trim() || undefined;
            const fecha_fin = String(req.query.fecha_fin || '').trim() || undefined;
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

            const resultado = await KardexService.obtenerMovimientos({
                id_empresa: id_empresa || undefined,
                id_articulo,
                tipo_movimiento,
                categoria,
                fecha_inicio,
                fecha_fin,
                page,
                limit,
            });
            // console.log(resultado)
            res.status(200).json(resultado);
        } catch (e: any) {
            console.error('[KardexController.obtenerMovimientos]', e);
            if (res.headersSent) return;
            res.status(400).json({ ok: false, message: e.message ?? 'Error al obtener movimientos' });
        }
    },

    obtenerProyecciones: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || req.query.id_empresa || '').trim();
            const id_articulo = String(req.query.id_articulo || '').trim() || undefined;
            const dias = Number(req.query.dias) || 15;
            const today = String(req.query.today || '').trim() || undefined;

            // si viene id_empresa lo pasamos como array de empresas
            const empresas = id_empresa ? [id_empresa] : undefined;

            const resultado = await KardexService.obtenerProyecciones({
                empresas,
                id_articulo,
                dias,
                today,
            });

            res.status(200).json({ ok: true, data: resultado });
        } catch (e: any) {
            console.error('[KardexController.obtenerProyecciones]', e);
            if (res.headersSent) return;
            res.status(400).json({ ok: false, message: e.message ?? 'Error al obtener proyecciones' });
        }
    },
    /**      const stocks = await Stock_Ubicacion_Lote.findAll({
                where: {
                    id_empresa_sucursal: filters.id_sucursal,
                    id_articulo: { [Op.in]: idsArticulos },
                },
                attributes: [
                    'id_articulo',
                    [fn('COALESCE', fn('SUM', col('cantidad')), 0), 'existencia_total'],
                    [fn('COALESCE', fn('SUM', literal(`cantidad - COALESCE(cantidad_apartada, 0)`)), 0), 'existencia_disponible'],
                ],
                group: ['id_articulo'],
                raw: true,
            }); */


};
