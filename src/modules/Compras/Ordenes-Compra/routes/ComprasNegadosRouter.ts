import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../../../../middleware/auth';
import { NegadosGlobalesService, OrigenNegado, EstadoNegadoFiltro } from '../services/NegadosGlobales.service';

const router = Router();
router.use(authMiddleware);

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// GET /compras_negados?origen=todos|proveedor|cliente&estado=pendientes|recuperados|todos&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&busqueda=…
// Todos los negados: los que nos negó el proveedor y los que negamos a clientes.
router.get('/', async (req: AuthedRequest, res: Response) => {
    try {
        const origen = (['proveedor', 'cliente'].includes(String(req.query.origen)) ? req.query.origen : 'todos') as OrigenNegado;
        const estado = (['recuperados', 'todos'].includes(String(req.query.estado)) ? req.query.estado : 'pendientes') as EstadoNegadoFiltro;
        const desde = FECHA.test(String(req.query.desde ?? '')) ? String(req.query.desde) : undefined;
        const hasta = FECHA.test(String(req.query.hasta ?? '')) ? String(req.query.hasta) : undefined;
        const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda.slice(0, 80) : undefined;

        res.json(await NegadosGlobalesService.listar({ origen, estado, desde, hasta, busqueda }));
    } catch (e: any) {
        console.error('[ComprasNegados]', e);
        res.status(500).json({ message: e?.message ?? 'No se pudieron consultar los negados.' });
    }
});

export default router;
