import { Router } from "express";
import { ClienteController } from "../../controllers/VentaMostrador/ClienteController";
const router = Router();


router.get('/:id_cliente', ClienteController.getByID)
router.post('/', ClienteController.create);

// router.put('/:id_articulo', ClienteController.actualizarByID)
// router.get('/', ClienteController.getAllPaginados);
// router.get('/paginaDeArticulo/:id_artic', ClienteController.getPaginaArticuloParaContinuarCompra)
// router.get('/paraCompra/:id_empresasucursal', ClienteController.getAllParaCompra);

export default router;