import { Router } from 'express';
import { CatalogosController } from '../controllers/CatalagosController';

const router = Router();

router.get('/cliente_almacen', CatalogosController.getAllCatalagosClienteAlmacen);

export default router;
