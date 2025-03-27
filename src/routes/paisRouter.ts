import { Router } from "express";
import { PaisController } from "../controllers/PaisController";
const router = Router()

router.get('/', PaisController.getAll)

router.post('/', PaisController.create)
router.get('/:id', PaisController.getById)


export default router