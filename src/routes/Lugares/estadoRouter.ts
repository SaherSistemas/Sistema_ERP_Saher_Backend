import { Router } from "express";
import { EstadoController } from "../../controllers/Lugares/EstadoController"
const router = Router()

router.get('/', EstadoController.getAllEstados)
router.get('/estadosActivos', EstadoController.getAllActivos)
router.post('/', EstadoController.createEstado)
router.get('/todosEstadosPorPais/:id_pais_esta', EstadoController.getEstadosPorPais)
router.get('/:id_esta', EstadoController.getEstadoById)
router.put('/:id_esta', EstadoController.updateByID)
router.delete('/statusEstado/:id_esta', EstadoController.cambiarEstatus)

export default router