import { Router } from 'express';
import { Comision_Regla_AgenteController } from '../controllers/Comision_Regla_AgenteController';

const router = Router();

// ── GET /api/comision-reglas
// Todas las reglas — carga inicial del módulo de comisiones en el frontend
router.get('/', Comision_Regla_AgenteController.getAll);

// ── GET /api/comision-reglas/agente/:id_agente
// Reglas de un agente
router.get('/agente/:id_agente', Comision_Regla_AgenteController.getByAgente);

// ── GET /api/comision-reglas/agente/:id_agente/efectiva/:id_cliente_alm
// Regla efectiva (excepción si existe, si no base, si no default)
router.get('/agente/:id_agente/efectiva/:id_cliente_alm', Comision_Regla_AgenteController.getReglaEfectiva);

// ── PUT /api/comision-reglas/agente/:id_agente/base
// Upsert regla base del agente
router.put('/agente/:id_agente/base', Comision_Regla_AgenteController.upsertReglaBase);

// ── PUT /api/comision-reglas/agente/:id_agente/excepcion/:id_cliente_alm
// Upsert excepción de un cliente
router.put('/agente/:id_agente/excepcion/:id_cliente_alm', Comision_Regla_AgenteController.upsertExcepcion);

// ── DELETE /api/comision-reglas/agente/:id_agente/excepcion/:id_cliente_alm
// Eliminar excepción de un cliente
router.delete('/agente/:id_agente/excepcion/:id_cliente_alm', Comision_Regla_AgenteController.deleteExcepcion);

export default router;
