import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth';
import { DevolucionClienteController } from '../controllers/Devolucion_Cliente.controller';

const router = Router();

// Todas las rutas requieren JWT de agente
router.use(authMiddleware);

// Buscar facturas del agente (para el selector del form)
router.get('/buscar-facturas', DevolucionClienteController.buscarFacturas);

// ── Admin: crear desde el ERP + inventario virtual de agentes ──
router.get('/admin/buscar-facturas', DevolucionClienteController.buscarFacturasAdmin);
router.get('/admin/factura/:id_factura', DevolucionClienteController.getFacturaAdmin);
router.post('/admin', DevolucionClienteController.crearAdmin);
router.get('/inventario-virtual', DevolucionClienteController.inventarioVirtual);
router.post('/inventario-virtual/recibir', DevolucionClienteController.recibirInventarioVirtual);
router.post('/inventario-virtual/agregar', DevolucionClienteController.agregarInventarioVirtual);
router.patch('/inventario-virtual/lote', DevolucionClienteController.asignarLoteInventarioVirtual);

// Mi inventario virtual (agente logueado), por artículo
router.get('/mi-inventario-virtual', DevolucionClienteController.miInventarioVirtual);

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
