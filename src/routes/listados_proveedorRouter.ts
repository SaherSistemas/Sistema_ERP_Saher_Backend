import { Router } from "express";
import { Listado_ProveedorController } from "../controllers/Listado_ProveedorController"
const router = Router()

router.get('/', Listado_ProveedorController.cargarListadosProveedor)

export default router;