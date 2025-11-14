import { Router } from 'express';
import { PrioridadAgenteReglasController } from '../../../controllers/Usuarios/Agente_De_Ventas/Prioridad_Agente_ReglaController';

const router = Router();

router.get('/:id_agente', PrioridadAgenteReglasController.getByAgente);
router.post('/', PrioridadAgenteReglasController.create);
router.put('/:id_regla', PrioridadAgenteReglasController.update);
router.delete('/:id_regla', PrioridadAgenteReglasController.delete);

export default router;
