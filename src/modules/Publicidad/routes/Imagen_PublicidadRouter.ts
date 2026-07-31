import { Router } from 'express';
import { ImagenPublicidadController } from '../controller/Imagen_PublicidadController';

const router = Router();

router.get('/empresa/:id_empre',         ImagenPublicidadController.getByEmpresa);
router.get('/empresa/:id_empre/activas', ImagenPublicidadController.getByEmpresaActivas);
router.post('/upload',                   ImagenPublicidadController.upload);
router.put('/reordenar',                 ImagenPublicidadController.reordenar);
router.put('/:id_imagen',                ImagenPublicidadController.update);
router.delete('/:id_imagen',             ImagenPublicidadController.delete);

export default router;
