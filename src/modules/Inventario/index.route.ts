import { Router } from 'express';
import ubicacion_Router from './Ubicaciones/routes/ubicacion_SucursalRoutes';

const router = Router();

router.use('/ubicacion_sucursal', ubicacion_Router);


export default router;
