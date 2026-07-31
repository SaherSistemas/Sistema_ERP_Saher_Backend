import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CxPController } from '../controllers/CxPController';
import { authMiddleware } from '../../../../middleware/auth';

// Directorio donde se guardan los comprobantes de pago
const uploadDir = path.join(process.cwd(), 'uploads', 'comprobantes_cxp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `cxp_${Date.now()}${ext}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);

router.get('/dashboard',                              CxPController.getDashboard);
router.get('/saldo-historico/:id_prove',              CxPController.getSaldoHistoricoProveedor);
router.get('/reporte-saldos',                         CxPController.reporteSaldosProveedores);
router.get('/',                            CxPController.getAll);
router.get('/proveedor/:id_proveedor',     CxPController.getByProveedor);
router.get('/comprobante/:id_pago_cxp',    CxPController.getComprobante);
router.get('/:id_cxp',                     CxPController.getById);

router.post('/',                           CxPController.create);
router.post('/pago', upload.single('comprobante'), CxPController.registrarPagoMultiple);
router.get('/pago/:id_pago_grupo', CxPController.getPagoMultiple as any);

router.patch('/marcar-vencidas',           CxPController.marcarVencidas);
router.post('/generar-desde-facturas',     CxPController.generarDesdeFacturas);

// ── Grupos de líneas de pago (múltiples facturas) ───────────────────────────
router.post('/grupos-linea',                                          CxPController.crearGrupoLineaPago);
router.get('/grupos-linea/todos',                                     CxPController.getGruposLinea);
router.get('/grupos-linea/por-cxp/:id_cxp',                          CxPController.getGruposPorCxP);
router.patch('/grupos-linea/:id_grupo/registrar', upload.single('comprobante'), CxPController.registrarGrupoLinea);
router.patch('/grupos-linea/:id_grupo/cancelar',                      CxPController.cancelarGrupoLinea);

// ── Líneas de pago ──────────────────────────────────────────────────────────
router.post('/lineas-pago',                                       CxPController.crearLineaPago);
router.get('/lineas-pago/todas',                                  CxPController.getTodasLineasPendientes);
router.get('/lineas-pago/registradas-mes',                        CxPController.getLineasRegistradasMes);
router.get('/lineas-pago/pendientes/:id_cxp',                     CxPController.getLineasPendientes);
router.get('/grupos-linea/registrados-mes',                       CxPController.getGruposRegistradosMes);
router.patch('/lineas-pago/:id_linea/registrar', upload.single('comprobante'), CxPController.registrarDesdeLínea);
router.patch('/lineas-pago/:id_linea/cancelar',                   CxPController.cancelarLinea);
router.get('/lineas-pago/:id_linea/comprobante',                  CxPController.getComprobanteLinea);
router.get('/grupos-linea/:id_grupo/comprobante',                 CxPController.getComprobanteGrupo);

export default router;
