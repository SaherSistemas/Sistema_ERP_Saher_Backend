import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { TableroAlmacenService } from '../services/TableroAlmacen.service';
import { ProductividadAlmacenService } from '../services/ProductividadAlmacen.service';
import { ValorInventarioService, type OrdenValor } from '../services/ValorInventario.service';
import { DiasInventarioService } from '../services/DiasInventario.service';
import { NegadosVigentesService } from '../services/NegadosVigentes.service';
import { CaducidadesService, type RangoCaducidad } from '../services/Caducidades.service';
import { SinExistenciaService } from '../services/SinExistencia.service';

export const TableroAlmacenController = {
    // GET /almacen/tablero — resumen de la existencia de la empresa del usuario
    getResumen: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || '').trim();
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await TableroAlmacenService.getResumen(id_empresa));
        } catch (e: any) {
            console.error('[TableroAlmacen.getResumen]', e);
            res.status(500).json({ message: e?.message ?? 'Error al armar el tablero de almacén.' });
        }
    },

    // GET /almacen/tablero/valor-costo?page=1&limit=50&q=texto&orden=valor|existencia|nombre
    // Lista paginada de artículos con su existencia y valor al costo, más los totales de todo el filtro
    getValorCosto: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || '').trim();
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
            const limit = Math.min(200, Math.max(10, Math.floor(Number(req.query.limit) || 50)));
            const orden = (['valor', 'existencia', 'nombre'] as OrdenValor[]).includes(req.query.orden as OrdenValor)
                ? (req.query.orden as OrdenValor) : 'valor';
            const q = typeof req.query.q === 'string' ? req.query.q : '';
            res.status(200).json(await ValorInventarioService.getLista(id_empresa, { page, limit, q, orden }));
        } catch (e: any) {
            console.error('[TableroAlmacen.getValorCosto]', e);
            res.status(500).json({ message: e?.message ?? 'Error al consultar el valor del inventario.' });
        }
    },

    // GET /almacen/tablero/dias-inventario?dias=90&limite=30
    // Artículos agotados, críticos o bajos según el ritmo real de salida de los últimos X días
    getDiasInventario: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || '').trim();
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            const dias = Math.min(365, Math.max(7, Math.floor(Number(req.query.dias) || 90)));
            const limite = Math.min(200, Math.max(10, Math.floor(Number(req.query.limite) || 30)));
            const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
            res.status(200).json(await DiasInventarioService.getLista(id_empresa, dias, limite, page));
        } catch (e: any) {
            console.error('[TableroAlmacen.getDiasInventario]', e);
            res.status(500).json({ message: e?.message ?? 'Error al calcular los días de inventario.' });
        }
    },

    // GET /almacen/tablero/sin-existencia?page=1&limite=50&q=texto&orden=venta|nombre
    // Artículos del catálogo sin existencia en la empresa, con la fecha de su última salida
    getSinExistencia: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || '').trim();
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
            const limite = Math.min(200, Math.max(10, Math.floor(Number(req.query.limite) || 50)));
            const q = typeof req.query.q === 'string' ? req.query.q : '';
            const orden = req.query.orden === 'nombre' ? 'nombre' : 'venta';
            res.status(200).json(await SinExistenciaService.getLista(id_empresa, { page, limite, q, orden }));
        } catch (e: any) {
            console.error('[TableroAlmacen.getSinExistencia]', e);
            res.status(500).json({ message: e?.message ?? 'Error al consultar los artículos sin existencia.' });
        }
    },

    // GET /almacen/tablero/caducidades?rango=caducadas|30|90|180&page=1&limite=50
    // Lotes con existencia de cada tarjeta de caducidad, paginados
    getCaducidades: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || '').trim();
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            const rango = String(req.query.rango ?? '');
            if (!['caducadas', '30', '90', '180'].includes(rango)) {
                res.status(400).json({ message: 'Rango de caducidad no válido.' });
                return;
            }
            const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
            const limite = Math.min(200, Math.max(10, Math.floor(Number(req.query.limite) || 50)));
            res.status(200).json(await CaducidadesService.getLista(id_empresa, rango as RangoCaducidad, page, limite));
        } catch (e: any) {
            console.error('[TableroAlmacen.getCaducidades]', e);
            res.status(500).json({ message: e?.message ?? 'Error al consultar las caducidades.' });
        }
    },

    // GET /almacen/tablero/negados — negados vigentes con su estado (ya entró, en recibo, en camino, sin comprar)
    getNegadosVigentes: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || '').trim();
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await NegadosVigentesService.getLista(id_empresa));
        } catch (e: any) {
            console.error('[TableroAlmacen.getNegadosVigentes]', e);
            res.status(500).json({ message: e?.message ?? 'Error al consultar los negados vigentes.' });
        }
    },

    // GET /almacen/tablero/procesos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD — tiempo promedio de surtido, chequeo y empaque por empleado
    getProcesos: async (req: AuthedRequest, res: Response) => {
        try {
            // Rango de fechas (YYYY-MM-DD, ambos incluidos). Sin parámetros: los últimos 30 días.
            const esFecha = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
            const hoy = new Date();
            const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const ini30 = new Date(hoy); ini30.setDate(ini30.getDate() - 30);
            let desde = esFecha(req.query.desde) ? req.query.desde : ymd(ini30);
            let hasta = esFecha(req.query.hasta) ? req.query.hasta : ymd(hoy);
            if (desde > hasta) [desde, hasta] = [hasta, desde];
            // Tope de un año para no armar consultas enormes
            if ((Date.parse(hasta) - Date.parse(desde)) / 86_400_000 > 366) {
                res.status(400).json({ message: 'El rango de fechas no puede pasar de un año.' });
                return;
            }
            res.status(200).json(await ProductividadAlmacenService.getProcesos(desde, hasta));
        } catch (e: any) {
            console.error('[TableroAlmacen.getProcesos]', e);
            res.status(500).json({ message: e?.message ?? 'Error al calcular los tiempos de los procesos.' });
        }
    },
};
