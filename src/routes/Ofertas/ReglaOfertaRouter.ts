import { Router } from "express";
import { ReglaOfertaController } from "../../controllers/Ofertas/ReglaOfertaController";

const router = Router();

router.get('/', ReglaOfertaController.getAll);
router.get('/:id', ReglaOfertaController.getByID);
router.post('/', ReglaOfertaController.create);
router.put('/update/:id', ReglaOfertaController.update);


export default router;
