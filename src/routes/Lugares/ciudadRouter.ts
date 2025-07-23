import { Router } from "express";
import { CiudadController } from "../../controllers/Lugares/CiudadController";
const router = Router()

router.get('/', CiudadController.getAllCiudades)
router.get('/ciudadesActivas', CiudadController.ciudadesActivas)
router.get('/:id_ciuda', CiudadController.getCiudadById)
router.get('/ciudadesEstado/:id_esta_ciuda', CiudadController.getCiudadesPorEstado)
router.post('/', CiudadController.crearCiudad)
router.put('/:id_ciuda', CiudadController.updateByID)
router.delete('/cambiarStatus/:id_ciuda', CiudadController.cambiarStatus)

export default router;