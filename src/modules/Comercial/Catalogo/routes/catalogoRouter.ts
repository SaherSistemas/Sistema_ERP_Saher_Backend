import { Router } from 'express';
import { CatalogosController } from '../../../Catalogos/controllers/CatalagosController';
import { CatalogoComercialController } from '../controllers/CatalogoComercialController';

const router = Router();

router.get('/pedido', CatalogoComercialController.getCatalagoComercialArticulosPromocionadosAlmacen)

export default router;
