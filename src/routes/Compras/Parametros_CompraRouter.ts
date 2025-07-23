import { Router } from "express";
import { Parametros_CompraController } from "../../controllers/Compras/Parametros_CompraController";
const router = Router()

router.get('/', Parametros_CompraController.getAll)
router.get('/:id_parametro_comp', Parametros_CompraController.getById)
router.get('/empresa/:id_empresa', Parametros_CompraController.getByIdEmpresa)
router.post('/', Parametros_CompraController.crearParametro)
router.put('/:id_parametro_comp', Parametros_CompraController.updateByID)

export default router;