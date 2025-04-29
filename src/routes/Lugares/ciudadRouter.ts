import { Router } from "express";
import { CiudadController } from "../../controllers/Lugares/CiudadController";
const router = Router()

router.get('/', CiudadController.getAllCiudades)
router.get('/ciudadesEstado/:id_esta_ciuda', CiudadController.ciudadesConEstado)
router.get('/:id_ciuda', CiudadController.getCiudadById)
router.post('/', CiudadController.crearCiudad)
router.put('/:id_ciuda', CiudadController.updateByID)
router.delete('/cambiarStatus/:id_ciuda', CiudadController.cambiarStatus)

export default router;