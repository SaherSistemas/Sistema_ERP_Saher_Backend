import { Router } from "express";
import { OfertaController } from "../../controllers/Ofertas/OfertaController";

const router = Router();

router.get('/', OfertaController.getAll);
router.get('/aplicables', OfertaController.getOfertasAplicables);
router.get('/:id', OfertaController.getByID);
router.post('/', OfertaController.create);
router.put('/update/:id', OfertaController.update);


export default router;
