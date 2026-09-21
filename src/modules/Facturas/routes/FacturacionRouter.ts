import { Router } from 'express';
import { FacturacionController } from '../controllers/FacturacionController';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

// Reintentar timbrado de una factura PEN (I, E o P)
// POST /api/facturas/reintentar/:id_factura
router.post('/reintentar/:id_factura', authMiddleware, FacturacionController.reintentarTimbrado);

// Admin: reinsertar traslado en PolyDB cuando falló el insert original
// POST /api/facturas/reinsertar-poly/:id_factura
router.post('/reinsertar-poly/:id_factura', authMiddleware, FacturacionController.reinsertarEnPolyDB);

// Dashboard
router.get('/dashboard/resumen-diario', authMiddleware, FacturacionController.resumenDiario);
router.get('/dashboard/top-clientes', authMiddleware, FacturacionController.topClientes);
router.get('/dashboard/top-articulos', authMiddleware, FacturacionController.topArticulos);

// Bitácora de créditos autorizados por un administrador (debe ir antes de '/:id_factura')
// GET /api/facturas/autorizaciones-credito?fecha_inicio=&fecha_fin=
router.get('/autorizaciones-credito', authMiddleware, FacturacionController.getAutorizacionesCredito);

// Lista de facturas con filtros opcionales
// GET /api/facturas?estatus=TIM&tipo_cfdi=I&fecha_inicio=&fecha_fin=&busqueda=&page=1&limit=50
router.get('/', authMiddleware, FacturacionController.getList);
router.get('/:id_factura/lotes', authMiddleware, FacturacionController.getLotesByFactura);
router.get('/:id_factura', authMiddleware, FacturacionController.getById);

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

// Crea la remisión faltante de una factura de Público General
// POST /api/facturas/:id_factura/remision
router.post('/:id_factura/remision', authMiddleware, FacturacionController.generarRemision);

// Deshace la facturación de un pedido aún sin timbrar (requiere credenciales de administrador)
// POST /api/facturas/:id_factura/deshacer  body: { usuario_admin, password_admin, liberar_stock? }
router.post('/:id_factura/deshacer', authMiddleware, FacturacionController.deshacerFacturacion);

// Genera la hoja de traspaso de un traslado (tipo T) y la regresa como PDF
// POST /api/facturas/:id_factura/traspaso-pdf
router.post('/:id_factura/traspaso-pdf', authMiddleware, FacturacionController.generarTraspasoPdf);

// Descarga el PDF de un traslado (tipo T, estatus GEN)
// GET /api/facturas/traslado-pdf/:id_factura
router.get('/traslado-pdf/:id_factura', authMiddleware, FacturacionController.descargarTrasladoPdf);

// Recibe el XML timbrado por el facturador externo, genera PDF y actualiza la factura
// POST /api/facturas/recibir-xml/:id_factura  body: { xml: "..." }
router.post('/recibir-xml/:id_factura', authMiddleware, FacturacionController.recibirXml);

// Regenera el TXT de un complemento de pago (tipo P) sin consumir nuevo folio
// Limpia uuid_cfdi_pago y regresa estatus a PEN para que el watcher lo retimbre
// POST /api/facturas/regenerar-txt-pago/:id_factura
router.post('/regenerar-txt-pago/:id_factura', authMiddleware, FacturacionController.regenerarTxtPago);

export default router;
