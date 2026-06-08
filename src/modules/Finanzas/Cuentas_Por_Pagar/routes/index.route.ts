import { Router } from 'express';
import facturasRoutes from './facturas_Compra_ProveedorRouter';
import cxpRouter from './CxPRouter';

const router = Router();

router.use('/cxp/facturas_compra_proveedor', facturasRoutes);
router.use('/cxp', cxpRouter);

export default router;
