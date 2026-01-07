import { Router } from 'express';
import { uploadFactura } from '../../../middleware/multerUploadFacturaProveedor';
import { UploadsController } from '../controllers/UploadsController';

const router = Router();

router.post('/facturaProveedor', uploadFactura.single('archivo'), UploadsController.uploadsFacturaProveedor);

export default router;
