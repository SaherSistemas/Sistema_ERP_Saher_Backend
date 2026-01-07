import { Router } from 'express';
import facturasRoutes from './facturas_Compra_ProveedorRouter';
// en un futuro: import pagosRoutes from './pagosRouter';

const router = Router();

router.use('/facturas_compra_proveedor', facturasRoutes);
// router.use('/pagos', pagosRoutes);

export default router;
