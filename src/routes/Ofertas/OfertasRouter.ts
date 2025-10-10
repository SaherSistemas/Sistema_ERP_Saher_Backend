import { Router } from "express";
import { OfertaController } from "../../controllers/Ofertas/OfertaController";

const router = Router();


router.get('/aplicables', OfertaController.getOfertasAplicables);
router.get('/', OfertaController.getAll);
router.get('/:identificador_oferta', OfertaController.getByID);
router.post('/', OfertaController.create);
router.put('/update/:id', OfertaController.update);


export default router;
