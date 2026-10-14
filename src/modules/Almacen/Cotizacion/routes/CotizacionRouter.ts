import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import multer from 'multer';
import { CotizacionService } from '../services/Cotizacion.service';

const router = Router();
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const manejar = (res: Response, error: any, mensaje: string) => {
    if (error?.status) {
        res.status(error.status).json({ message: error.message, mensaje: error.message });
        return;
    }
    console.error('[Cotizacion]', error);
    res.status(400).json({ message: error?.message ?? mensaje, mensaje: error?.message ?? mensaje });
};

// GET /almacen/cotizacion/clientes?q=
router.get('/clientes', async (req: Request, res: Response) => {
    try {
        res.json(await CotizacionService.buscarClientes(String(req.query.q ?? '')));
    } catch (e) { manejar(res, e, 'No se pudo buscar clientes.'); }
});

// GET /almacen/cotizacion/articulos?q=&id_cliente=
router.get('/articulos', async (req: Request, res: Response) => {
    try {
        res.json(await CotizacionService.buscarArticulos(
            String(req.query.q ?? ''), String(req.query.id_cliente ?? ''), (req as AuthedRequest).user?.id_empresa,
        ));
    } catch (e) { manejar(res, e, 'No se pudo buscar artículos.'); }
});

// POST /almacen/cotizacion/leer-excel  (form-data: archivo, id_cliente, codigo, barras, descripcion, piezas, precio, fila_inicio)
router.post('/leer-excel', subida.single('archivo'), async (req: Request, res: Response) => {
    try {
        if (!req.file) { res.status(400).json({ message: 'Selecciona el archivo de Excel.' }); return; }
        const b = req.body ?? {};
        const r = await CotizacionService.leerExcel({
            buffer: req.file.buffer,
            id_cliente: String(b.id_cliente ?? ''),
            id_empresa: (req as AuthedRequest).user?.id_empresa,
            columnas: {
                codigo: b.codigo, barras: b.barras, descripcion: b.descripcion, piezas: b.piezas, precio: b.precio,
                filaInicio: Number(b.fila_inicio) || undefined,
            },
        });
        res.json(r);
    } catch (e) { manejar(res, e, 'No se pudo leer el Excel.'); }
});

// POST /almacen/cotizacion   { id_cliente, items: [{ id_articulo, cantidad, precio }] }
router.post('/', async (req: Request, res: Response) => {
    try {
        const r = await CotizacionService.crear({
            id_cliente: String(req.body?.id_cliente ?? ''),
            items: req.body?.items ?? [],
        });
        res.status(201).json(r);
    } catch (e) { manejar(res, e, 'No se pudo crear la cotización.'); }
});

export default router;
