import { Router } from 'express';
import ubicacion_Router from './Ubicaciones/routes/Ubicacion_SucursalRoutes';

const router = Router();

router.use('/ubicacion_sucursal_articulo', ubicacion_Router);


export default router;
