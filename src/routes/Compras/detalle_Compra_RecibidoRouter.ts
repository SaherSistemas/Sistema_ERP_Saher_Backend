import { Router } from "express";
import { Detalle_Compra_RecibidoController } from "../../controllers/Compras/Detalle_Compra_RecibidoController";
const router = Router();


router.post('/', Detalle_Compra_RecibidoController.createDetalleCompraRecibidos)
router.get('/:id_comp', Detalle_Compra_RecibidoController.getAllDetallesDeCompraRecibidosDeUnaCompra)



export default router