import { Router } from "express";
import { Listado_ProveedorController } from "../../controllers/Listado_ProveedorController"
import multer from "multer";

const router = Router()
const upload = multer({ dest: "uploads/" })

router.post('/upload', upload.single("archivo"), Listado_ProveedorController.cargarListadosProveedor)

export default router;