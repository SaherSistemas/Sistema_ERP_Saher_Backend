import { Router } from 'express';
import { EmpleadoController } from '../../controllers/Usuarios/EmpleadoController';

const router = Router();
router.get('/', EmpleadoController.getAllEmpleados);
router.get('/puede_ser_agente', EmpleadoController.getAllEmpleadoPuedeSerAgente);
router.get('/:id_empleado', EmpleadoController.getEmpleadoByID);
router.post('/', EmpleadoController.createEmpleado);
//router.put('/:id_empleado', EmpleadoController.updateEmpleado)
//router.delete('/cambiarStatus/:id_empleado', EmpleadoController.cambiarStatus);
export default router;
