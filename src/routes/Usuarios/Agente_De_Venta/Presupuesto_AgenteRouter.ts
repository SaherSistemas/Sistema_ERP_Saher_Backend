import { Router } from 'express';
import { PresupuestoAgenteController } from '../../../controllers/Usuarios/Agente_De_Ventas/Presupuesto_AgenteController';

const router = Router();
router.get('/', PresupuestoAgenteController.getAll);
// Obtener presupuesto activo del agente
router.get('/activo/:id_agente', PresupuestoAgenteController.getActivo);

// Crear un nuevo presupuesto para el agente
router.post('/', PresupuestoAgenteController.create);

// Cerrar mes del agente
router.post('/cerrar/:id_agente', PresupuestoAgenteController.cerrarMes);

// Obtener historial del agente
router.get('/historico/:id_agente', PresupuestoAgenteController.getHistorico);

router.get('/activos', PresupuestoAgenteController.getActivos);
router.get('/movimientos/:id_presupuesto_agente', PresupuestoAgenteController.getMovimientos);
router.get('/historico/:id_agente', PresupuestoAgenteController.getHistorico);

export default router;
