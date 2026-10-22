import { Router } from 'express';
import { KardexController } from '../controllers/KardexController';

const router = Router();

router.get('/movimientos', KardexController.obtenerMovimientos);

// GET /api/almacen/kardex/articulo/:id_articulo?fecha_inicio&fecha_fin → kardex del artículo con saldo corrido
router.get('/articulo/:id_articulo', KardexController.obtenerKardexArticulo);

// GET /api/almacen/kardex/saldos-negativos → artículos con saldo inicial negativo
router.get('/saldos-negativos', KardexController.obtenerSaldosNegativos);

router.get('/proyecciones', KardexController.obtenerProyecciones);
router.post('/', KardexController.crearMovimiento);

export default router;
