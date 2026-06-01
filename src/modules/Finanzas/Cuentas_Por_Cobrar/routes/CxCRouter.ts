import { Router } from 'express';
import { CxCController } from '../controllers/CxCController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();

// ─── DASHBOARD / RESUMEN ──────────────────────────────────────────────────────
// GET /api/cxc/resumen
router.get('/resumen', CxCController.getResumenGeneral);

// ─── CLIENTES CON SALDO + PAGO POR RECIBO ────────────────────────────────────
// GET  /api/cxc/clientes-deudores
//   → todos los clientes con CxC pendientes y sus facturas (para el formulario de pago)
// POST /api/cxc/cliente/:id_cliente_alm/pago
//   → registrar un recibo de pago con abonos a múltiples CxC del cliente
router.get('/clientes-deudores', authMiddleware, CxCController.getClientesDeudores);
router.post('/cliente/:id_cliente_alm/pago', CxCController.capturarPagoCliente);

// ─── ANTIGÜEDAD DE SALDOS ────────────────────────────────────────────────────
// GET /api/cxc/antiguedad-saldos                     → todos los clientes
// GET /api/cxc/antiguedad-saldos/:id_cliente_alm     → un cliente
router.get('/antiguedad-saldos', CxCController.getAntiguedadSaldos);
router.get('/antiguedad-saldos/:id_cliente_alm', CxCController.getAntiguedadByCliente);

// ─── ESTADO DE CUENTA ────────────────────────────────────────────────────────
// GET /api/cxc/estado-cuenta/:id_cliente_alm
// Query params opcionales: ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
router.get('/estado-cuenta/:id_cliente_alm', CxCController.getEstadoCuenta);

// ─── CONSULTAS (sin parámetro wildcard) ───────────────────────────────────────
router.get('/', CxCController.getAll);
router.get('/vencidas', CxCController.getVencidas);
router.get('/cliente/:id_cliente_alm', CxCController.getByCliente);

// ─── PAGOS ────────────────────────────────────────────────────────────────────
router.get('/pagos/pendientes', CxCController.getPagosParaAplicar);
router.get('/pagos/aplicados', CxCController.getPagosAplicados);
router.get('/pagos/historial/:id_cxc', CxCController.getHistorialCxC);
router.get('/pagos/mis-recibos', authMiddleware, CxCController.getMisRecibos);
router.post('/:id_cxc/pago', CxCController.capturarPago);
router.patch('/pago/:id_pago_cxc/aplicar', CxCController.aplicarPago);
router.patch('/pago/:id_pago_cxc/editar', CxCController.editarPago);
router.patch('/pago/:id_pago_cxc/cancelar', CxCController.cancelarPago);

// ─── TIMBRADO ─────────────────────────────────────────────────────────────────
router.get('/cfdi-por-timbrar', CxCController.getCFDIPorTimbrar);
router.get('/pagos/sin-cfdi', CxCController.getPagosAplicadosSinCFDI);
router.post('/timbrar-pagos', CxCController.timbrarPagosPendientes);
router.post('/pago/:id_pago_cxc/timbrar-manual', CxCController.timbrarManual);

// ─── RECIBO DE COBRANZA PDF ───────────────────────────────────────────────────
// GET /api/cxc/recibo/:numero_recibo/pdf
router.get('/recibo/:numero_recibo/pdf', CxCController.getReciboPDF);

// ─── JOBS ─────────────────────────────────────────────────────────────────────
router.patch('/marcar-vencidas', CxCController.marcarVencidas);

// ─── SALDO HISTÓRICO ─────────────────────────────────────────────────────────
// GET /api/finanzas/cxc/saldo-historico/:id_cliente_alm?fecha_corte=YYYY-MM-DD
router.get('/saldo-historico/:id_cliente_alm', CxCController.getSaldoHistorico);

// ─── WILDCARD (debe ir al final para no capturar rutas nombradas) ─────────────
router.get('/:id_cxc', CxCController.getById);

export default router;
