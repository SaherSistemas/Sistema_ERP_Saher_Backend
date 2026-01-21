import { Router } from 'express';
import { CatUsoCFDIController } from '../controllers/Cat_Uso_CFDIController';

const router = Router();

router.get('/', CatUsoCFDIController.getAll);
router.get('/:id', CatUsoCFDIController.getById);
router.post('/', CatUsoCFDIController.create);
router.put('/:id', CatUsoCFDIController.update);
router.delete('/:id', CatUsoCFDIController.delete);

export default router;
