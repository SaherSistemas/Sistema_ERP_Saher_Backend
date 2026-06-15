import { Router } from 'express';
import { ValeController } from '../controllers/Vale.controller';

const router = Router();

// POST   /vales                          → crear vale
router.post('/', ValeController.crearVale);

// GET    /vales/periodo?fecha_inicio=&fecha_fin=&id_empresa=   → vales chequeados del período
router.get('/periodo', ValeController.getValesPorPeriodo);

// GET    /vales/deuda?id_empresa=        → deuda actual por empleado
router.get('/deuda', ValeController.getDeudaEmpleados);

// GET    /vales/empleado/:id_empleado/activos → vales activos con artículos
router.get('/empleado/:id_empleado/activos', ValeController.getValesActivosEmpleado);

// POST   /vales/seed-status-pf              → insertar status PF en catálogo
router.post('/seed-status-pf', ValeController.seedStatusPF);

// PATCH  /vales/marcar-pf                   → marcar vales CH → PF
router.patch('/marcar-pf', ValeController.marcarComoPF);

// PATCH  /vales/empleado/:id_empleado/limite   → actualizar límite de crédito
router.patch('/empleado/:id_empleado/limite', ValeController.actualizarLimiteCredito);

// PATCH  /vales/empleado/:id_empleado/descontar → descontar de nomina (reduce saldo_vale_actual)
router.patch('/empleado/:id_empleado/descontar', ValeController.descontarSaldo);

// POST   /vales/consolidar               → generar CFDI consolidado
router.post('/consolidar', ValeController.consolidarVales);

export default router;
