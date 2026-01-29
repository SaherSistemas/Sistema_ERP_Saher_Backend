import { Router } from 'express';
import ubicacion_Router from './Ubicaciones/routes/ubicacion_SucursalRoutes';

const router = Router();

router.use('/ubicacion', ubicacion_Router);


export default router;
