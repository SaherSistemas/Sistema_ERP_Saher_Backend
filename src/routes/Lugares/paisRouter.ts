import { Router } from "express";
import { PaisController } from "../../controllers/Lugares/PaisController";
const router = Router()

router.get('/', PaisController.getAll)
router.get('/paisesActivos', PaisController.getAllActivos)
router.post('/', PaisController.create)
router.get('/:id_pais', PaisController.getById)

router.put('/:id_pais', PaisController.updateByID)

router.delete('/estadopais/:id_pais', PaisController.cambiarEstatus)


export default router