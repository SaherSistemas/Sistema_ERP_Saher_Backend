import { Router } from 'express';
import { CxCController } from '../controllers/CxCController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();

// ─── DASHBOARD / RESUMEN ──────────────────────────────────────────────────────
// GET /api/cxc/resumen
router.get('/resumen',                                CxCController.getResumenGeneral);

// ─── CLIENTES CON SALDO + PAGO POR RECIBO ────────────────────────────────────
// GET  /api/cxc/clientes-deudores
//   → todos los clientes con CxC pendientes y sus facturas (para el formulario de pago)
// POST /api/cxc/cliente/:id_cliente_alm/pago
//   → registrar un recibo de pago con abonos a múltiples CxC del cliente
router.get('/clientes-deudores',                      authMiddleware, CxCController.getClientesDeudores);
router.post('/cliente/:id_cliente_alm/pago',          CxCController.capturarPagoCliente);

// ─── ANTIGÜEDAD DE SALDOS ────────────────────────────────────────────────────
// GET /api/cxc/antiguedad-saldos                     → todos los clientes
// GET /api/cxc/antiguedad-saldos/:id_cliente_alm     → un cliente
router.get('/antiguedad-saldos',                      CxCController.getAntiguedadSaldos);
router.get('/antiguedad-saldos/:id_cliente_alm',      CxCController.getAntiguedadByCliente);

// ─── ESTADO DE CUENTA ────────────────────────────────────────────────────────
// GET /api/cxc/estado-cuenta/:id_cliente_alm
// Query params opcionales: ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
router.get('/estado-cuenta/:id_cliente_alm',          CxCController.getEstadoCuenta);

// ─── CONSULTAS ────────────────────────────────────────────────────────────────
// GET /api/cxc/
// GET /api/cxc/vencidas
// GET /api/cxc/cliente/:id_cliente_alm
// GET /api/cxc/:id_cxc
router.get('/',                                       CxCController.getAll);
router.get('/vencidas',                               CxCController.getVencidas);
router.get('/cliente/:id_cliente_alm',                CxCController.getByCliente);
router.get('/:id_cxc',                                CxCController.getById);

// ─── PAGOS ────────────────────────────────────────────────────────────────────
// GET  /api/cxc/pagos/pendientes                     → pagos CAP sin aplicar
// GET  /api/cxc/pagos/historial/:id_cxc              → historial completo + CFDI
// POST /api/cxc/:id_cxc/pago                         → PASO 1: capturar pago
// PATCH /api/cxc/pago/:id_pago_cxc/aplicar           → PASO 2: aplicar pago
// PATCH /api/cxc/pago/:id_pago_cxc/cancelar          → cancelar pago CAP
router.get('/pagos/pendientes',                       CxCController.getPagosParaAplicar);
router.get('/pagos/historial/:id_cxc',                CxCController.getHistorialCxC);
router.post('/:id_cxc/pago',                          CxCController.capturarPago);
router.patch('/pago/:id_pago_cxc/aplicar',            CxCController.aplicarPago);
router.patch('/pago/:id_pago_cxc/cancelar',           CxCController.cancelarPago);

// ─── TIMBRADO EN LOTE ─────────────────────────────────────────────────────────
// POST /api/cxc/timbrar-pagos
router.post('/timbrar-pagos',                         CxCController.timbrarPagosPendientes);

// ─── JOBS ─────────────────────────────────────────────────────────────────────
// PATCH /api/cxc/marcar-vencidas
router.patch('/marcar-vencidas',                      CxCController.marcarVencidas);

export default router;
