import { Router } from 'express';
import { CxCController } from '../controllers/CxCController';

const router = Router();

// ─── CONSULTAS ────────────────────────────────────────────────────────────────
router.get('/',                                   CxCController.getAll);
router.get('/vencidas',                           CxCController.getVencidas);
router.get('/cliente/:id_cliente_alm',            CxCController.getByCliente);
router.get('/:id_cxc',                            CxCController.getById);

// ─── PAGOS ────────────────────────────────────────────────────────────────────
// Pagos en CAP pendientes de que el encargado los aplique
router.get('/pagos/pendientes',                   CxCController.getPagosParaAplicar);

// PASO 1 — Cualquier empleado captura el pago (estatus CAP, saldo intacto)
router.post('/:id_cxc/pago',                      CxCController.capturarPago);

// PASO 2 — El encargado aplica el pago (estatus APL, actualiza saldo, crea CFDI PEN)
router.patch('/pago/:id_pago_cxc/aplicar',        CxCController.aplicarPago);

// ─── TIMBRADO EN LOTE ─────────────────────────────────────────────────────────
// Timbra con Facturapi todos los Factura_Pago_CFDI que estén en estatus PEN
router.post('/timbrar-pagos',                     CxCController.timbrarPagosPendientes);

// ─── JOBS ─────────────────────────────────────────────────────────────────────
router.patch('/marcar-vencidas',                  CxCController.marcarVencidas);

export default router;
