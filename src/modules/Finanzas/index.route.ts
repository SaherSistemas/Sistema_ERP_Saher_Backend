import { Router } from 'express';
import cxpRoutes from './Cuentas_Por_Pagar/routes/index.route';

const router = Router();

router.use('/cxp', cxpRoutes);


export default router;
