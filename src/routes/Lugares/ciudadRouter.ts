import { Router } from "express";
import { CiudadController } from "../../controllers/Lugares/CiudadController";
const router = Router()

router.get('/', CiudadController.getAllCiudades)
router.post('/', CiudadController.crearCiudad)
router.get('/:id_ciuda', CiudadController.getCiudadById)
router.put('/:id_ciuda', CiudadController.updateByID)
router.put('/cambiarStatus/:id_ciuda', CiudadController.cambiarStatus)

export default router;