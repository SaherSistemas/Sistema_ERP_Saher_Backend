import { Router } from 'express';
import { KardexController } from '../controllers/KardexController';

const router = Router();

router.get('/movimientos', KardexController.obtenerMovimientos);

// GET /api/almacen/kardex/articulo/:id_articulo?fecha_inicio&fecha_fin → kardex del artículo con saldo corrido
router.get('/articulo/:id_articulo', KardexController.obtenerKardexArticulo);

router.get('/proyecciones', KardexController.obtenerProyecciones);
router.post('/', KardexController.crearMovimiento);

export default router;
