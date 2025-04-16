import { Router } from "express";
import { EstadoController } from "../../controllers/Lugares/EstadoController"
const router = Router()

router.get('/', EstadoController.getAllEstados)
router.post('/', EstadoController.createEstado)
router.get('/todosEstadosPorPais', EstadoController.getEstadosPorPais)
router.get('/:id_esta', EstadoController.getEstadoById)
router.put('/:id_esta', EstadoController.updateByID)
router.put('/statusEstado/:id_esta', EstadoController.cambiarEstatus)

export default router