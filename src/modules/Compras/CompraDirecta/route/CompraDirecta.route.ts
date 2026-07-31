import { Router } from 'express';
import { CompraDirectaController } from '../controller/CompraDirecta.controller';

const router = Router();

router.post('/', CompraDirectaController.registrar);

export default router;
