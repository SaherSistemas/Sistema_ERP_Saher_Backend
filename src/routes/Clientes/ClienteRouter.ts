import { Router } from "express";
import { ClienteController } from "../../controllers/Clientes/ClienteController";
const router = Router();


router.get('/:identificador_cliente', ClienteController.getByID);
router.get('/', ClienteController.getAll)
router.post('/', ClienteController.create);
router.get("/datos-beneficiado/:telefono", ClienteController.getDatosBeneficiado);

// router.get('/clienteGenerarPDF/', ClienteController.generarPDFListado)

export default router;