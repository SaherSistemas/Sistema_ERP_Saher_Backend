import { Router } from "express";
import { StockSucursalController } from "../../controllers/Stock/Stock_SucursalController";
const router = Router();

router.get('/', StockSucursalController.getAll);
router.get('/:id_artic', StockSucursalController.getAllsucursalesPorIdArticulo);
router.get('/articulosSucursal/:id_empre', StockSucursalController.getAllArticulosporSucursal);

router.post('/',StockSucursalController.create);



export default router;