import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth';
import { DevolucionClienteController } from '../controllers/Devolucion_Cliente.controller';

const router = Router();

// Todas las rutas requieren JWT de agente
router.use(authMiddleware);

// Buscar facturas del agente (para el selector del form)
router.get('/buscar-facturas', DevolucionClienteController.buscarFacturas);

// Mis solicitudes de devolución
router.get('/mis-devoluciones', DevolucionClienteController.misDevoluciones);

// Productos de una factura (step 2 del form)
router.get('/factura/:id_factura', DevolucionClienteController.getFacturaParaDevolucion);

// Detalle de una devolución
router.get('/:id', DevolucionClienteController.getById);

// Crear nueva solicitud
router.post('/', DevolucionClienteController.crear);

// ── Admin ──────────────────────────────────────────────────────────────────
// Todas las devoluciones con filtros opcionales
router.get('/', DevolucionClienteController.getAll);

// Aprobar → genera descuento en CxC o nota de crédito al cliente
router.post('/:id/aprobar', DevolucionClienteController.aprobar);

// Rechazar → solo cambia estatus, sin efectos financieros
router.post('/:id/rechazar', DevolucionClienteController.rechazar);

export default router;
