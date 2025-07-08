import {Router} from "express";
import { MetodoPagoController } from "../../controllers/Caja/Metodo_de_PagoController";

const router = Router();

router.get('/:id_metodo_pago', MetodoPagoController.getByID);
router.get('/', MetodoPagoController.getAll);   
router.post('/', MetodoPagoController.create);

export default router;