import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth';
import { NotaCreditoClienteController } from '../controllers/Nota_Credito_Cliente.controller';

const router = Router();

// GET /notas-credito                           → todas (admin, filtros opcionales)
router.get('/', authMiddleware, NotaCreditoClienteController.getAll);

// GET /notas-credito/cliente/:id_cliente_alm  → disponibles de un cliente
router.get('/cliente/:id_cliente_alm', authMiddleware, NotaCreditoClienteController.getDisponiblesCliente);

// GET /notas-credito/:id                       → detalle de una nota
router.get('/:id', authMiddleware, NotaCreditoClienteController.getById);

// POST /notas-credito/:id/aplicar              → aplicar (parcial o total) a una CxC
router.post('/:id/aplicar', authMiddleware, NotaCreditoClienteController.aplicar);

export default router;
