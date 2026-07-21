import { Router } from 'express';
import { Margen_Especial_ArticuloController } from '../controllers/Margen_Especial_ArticuloController';

const router = Router();

router.get('/', Margen_Especial_ArticuloController.getAll);
router.get('/articulo/:id_articulo', Margen_Especial_ArticuloController.getByArticulo);
router.post('/', Margen_Especial_ArticuloController.create);
router.put('/:id', Margen_Especial_ArticuloController.update);
router.delete('/:id', Margen_Especial_ArticuloController.delete);

export default router;
