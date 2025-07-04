import {Router} from "express";
import { ParametroCajaController } from "../../controllers/Caja/Parametros_CajaController";

const router = Router();



router.get('/:id_parametro_caja', ParametroCajaController.getByID);
router.get('/', ParametroCajaController.getAll);
router.post('/', ParametroCajaController.create);
router.put('/:id_parametro_caja', ParametroCajaController.update);

export default router;