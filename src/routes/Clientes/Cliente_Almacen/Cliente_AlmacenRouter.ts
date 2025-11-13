import { Router } from 'express';
import { Cliente_AlmacenController } from '../../../controllers/Clientes/Cliente_Almacen/Cliente_AlmacenController';

const router = Router();

router.get('/', Cliente_AlmacenController.getAllPaginado);

export default router;
