import { Router } from "express";
import { AlcanceOfertaController } from "../../controllers/Ofertas/AlcanceOfertaController";

const router = Router();

router.get('/', AlcanceOfertaController.getAll);
router.get('/:id', AlcanceOfertaController.getByID);
router.post('/', AlcanceOfertaController.create);
router.put('/update/:id', AlcanceOfertaController.update);


export default router;
