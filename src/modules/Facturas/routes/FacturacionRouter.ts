import { Router } from 'express';
import { FacturacionController } from '../controllers/FacturacionController';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

// Reintentar timbrado de una factura PEN (I, E o P)
// POST /api/facturas/reintentar/:id_factura
router.post('/reintentar/:id_factura', authMiddleware, FacturacionController.reintentarTimbrado);

// Lista de facturas con filtros opcionales
// GET /api/facturas?estatus=TIM&tipo_cfdi=I&fecha_inicio=&fecha_fin=&busqueda=&page=1&limit=50
router.get('/', authMiddleware, FacturacionController.getList);

// Legado: genera .txt para timbrado manual
// POST /api/facturas/generar-txt/:id_pedido_alm
router.post('/generar-txt/:id_pedido_alm', authMiddleware, FacturacionController.generarTxt);

// Timbra un CFDI de Ingreso directamente con Facturapi desde un pedido
// POST /api/facturas/timbrar-ingreso/:id_pedido_alm
router.post('/timbrar-ingreso/:id_pedido_alm', authMiddleware, FacturacionController.timbrarIngreso);

// Crea y timbra un CFDI de Egreso (Nota de Crédito)
// Body: { id_factura_origen: string }
// POST /api/facturas/timbrar-egreso
router.post('/timbrar-egreso', authMiddleware, FacturacionController.timbrarEgreso);

// Crea y timbra un CFDI de Complemento de Pago
// Body: { id_factura, fecha_pago, id_forma_pago, monto_pago, num_parcialidad, saldo_anterior, moneda?, id_pago_cxc? }
// POST /api/facturas/timbrar-pago
router.post('/timbrar-pago', authMiddleware, FacturacionController.timbrarPago);

// Descarga el PDF de un traslado (tipo T, estatus GEN)
// GET /api/facturas/traslado-pdf/:id_factura
router.get('/traslado-pdf/:id_factura', authMiddleware, FacturacionController.descargarTrasladoPdf);

export default router;
