import { Router } from "express";
import { ColoniaController } from "../../controllers/Lugares/ColoniaController";
const router = Router()

router.get('/', ColoniaController.getAllColonias)
router.get('/coloniasActivas', ColoniaController.coloniasActivas)
router.get('/:id_colonia', ColoniaController.getColoniaById);
router.post('/', ColoniaController.crearColonia)
router.put('/:id_colonia', ColoniaController.updateByID)
router.delete('/cambiarStatus/:id_colonia', ColoniaController.cambiarStatus)
export default router