import { Router } from "express";
import { EstadoController } from "../controllers/EstadoController"
const router = Router()

router.get('/', EstadoController.getAllEstados)

export default router