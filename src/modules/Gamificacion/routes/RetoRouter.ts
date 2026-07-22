import { Router } from 'express';
import { RetoController } from '../controller/Reto.controller';
const router = Router();

// Admin CRUD
router.get('/', RetoController.getAll);
router.post('/', RetoController.create);
router.put('/:id', RetoController.update);
router.patch('/:id/toggle', RetoController.toggleActivo);
router.delete('/:id', RetoController.delete);

// POS
router.get('/mis-retos', RetoController.getMisRetos);
router.post('/actualizar-progreso', RetoController.actualizarProgreso);

// Empleado stats
router.get('/puntos/:id_empleado', RetoController.getPuntosTotales);
router.get('/logros/:id_empleado', RetoController.getHistorialLogros);

export default router;
