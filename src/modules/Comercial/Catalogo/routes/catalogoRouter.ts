import { Router } from 'express';
import { CatalogoComercialController } from '../controllers/CatalogoComercialController';

const router = Router();

router.get('/pedido', CatalogoComercialController.getCatalagoComercialArticulosPromocionadosAlmacen)
router.get('/busqueda', CatalogoComercialController.getCatalagoComercialArticulosBusqueda);
export default router;
