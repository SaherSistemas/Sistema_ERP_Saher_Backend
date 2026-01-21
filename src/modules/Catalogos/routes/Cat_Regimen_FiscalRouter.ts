import { Router } from "express";
import { Cat_Regimen_FiscalController } from "../controllers/Cat_Regimen_FiscalController";
const router = Router();

router.get('/', Cat_Regimen_FiscalController.getAll)
router.get('/:id', Cat_Regimen_FiscalController.getById);
router.post('/', Cat_Regimen_FiscalController.create);
router.put('/:id', Cat_Regimen_FiscalController.updateByID);

export default router;