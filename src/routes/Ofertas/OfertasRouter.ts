import { Router } from "express";
import { OfertaController } from "../../controllers/Ofertas/OfertaController";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.get('/aplicables', OfertaController.getOfertasAplicables);
router.get('/', OfertaController.getAll);
router.get('/:identificador_oferta', OfertaController.getByID);
router.post('/', authMiddleware, OfertaController.create);
router.put('/:id', authMiddleware, OfertaController.update);

export default router;
