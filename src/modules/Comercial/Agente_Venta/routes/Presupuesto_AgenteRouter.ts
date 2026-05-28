import { Router } from 'express';
import { PresupuestoAgenteController } from '../controllers/Presupuesto_AgenteController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();

// ── Mi resumen (agente logueado — JWT) — debe ir ANTES que /:id_presupuesto_agente
router.get('/mi-resumen',   authMiddleware, PresupuestoAgenteController.getMiResumen);
router.get('/mi-historico', authMiddleware, PresupuestoAgenteController.getMiHistorico);

// ── Tablero general (debe ir ANTES que /:id_presupuesto_agente)
router.get('/tablero', PresupuestoAgenteController.getTablero);

// ── Activos y listado general
router.get('/activos', PresupuestoAgenteController.getActivos);
router.get('/', PresupuestoAgenteController.getAll);

// ── Por agente
router.get('/activo/:id_agente', PresupuestoAgenteController.getActivo);
router.get('/historico/:id_agente', PresupuestoAgenteController.getHistorico);
router.post('/cerrar/:id_agente', PresupuestoAgenteController.cerrarMes);

// ── Por presupuesto
router.get('/:id_presupuesto_agente/resumen', PresupuestoAgenteController.getResumen);
router.get('/movimientos/:id_presupuesto_agente', PresupuestoAgenteController.getMovimientos);
router.post('/:id_presupuesto_agente/ajuste', PresupuestoAgenteController.registrarAjuste);

// ── Crear
router.post('/', PresupuestoAgenteController.create);

export default router;
