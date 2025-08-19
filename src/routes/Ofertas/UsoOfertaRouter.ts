import { Router } from "express";
import { UsoOfertaController } from "../../controllers/Ofertas/UsoOfertaController";

const router = Router();

router.get('/', UsoOfertaController.getAll);
router.get('/:id', UsoOfertaController.getByID);
router.post('/', UsoOfertaController.create);
router.put('/update/:id', UsoOfertaController.update);


export default router;
