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
//router.get('/comprobante/:id_pago_cxp',    CxPController.getComprobante);
router.get('/:id_cxp',                     CxPController.getById);

router.post('/',                           CxPController.create);
router.post('/pago', upload.single('comprobante'), CxPController.registrarPagoMultiple);
router.get('/pago/:id_pago_grupo', CxPController.getPagoMultiple as any);

router.patch('/marcar-vencidas',           CxPController.marcarVencidas);
router.post('/generar-desde-facturas',     CxPController.generarDesdeFacturas);

export default router;
