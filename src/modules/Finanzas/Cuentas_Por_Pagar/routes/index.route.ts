import { Router } from 'express';
import facturasRoutes from './facturas_Compra_ProveedorRouter';
import { authMiddleware } from '../../../../middleware/auth';
// en un futuro: import pagosRoutes from './pagosRouter';

const router = Router();

router.use('/cxp/facturas_compra_proveedor', facturasRoutes);
// router.use('/pagos', pagosRoutes);

export default router;
