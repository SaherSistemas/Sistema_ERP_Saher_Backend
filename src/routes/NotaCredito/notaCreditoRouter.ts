import { Router } from "express";
import { NotaCreditoController } from "../../controllers/NotaCredito/NotaCreditoController";
import { uploadNotaCredito } from "../../middleware/multerUploadNotaCredito";
const router = Router()

router.post('/:compraId', uploadNotaCredito, NotaCreditoController.crearNotaCredito)


export default router   
