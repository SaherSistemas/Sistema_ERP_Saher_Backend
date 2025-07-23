import { Router } from "express";
import { ClienteController } from "../../controllers/Clientes/ClienteController";
const router = Router();


router.get('/:identificador_cliente', ClienteController.getByID);
router.get('/', ClienteController.getAll)
router.post('/', ClienteController.create);
router.get('/clienteGenerarPDF/', ClienteController.generarPDFListado)

//router.put('/:id_cliente', ClienteController.actualizarByID)
//router.patch('/:id_cliente', ClienteController.actualizarStatusByID);
// router.get('/', ClienteController.getAllPaginados);
// router.get('/paginaDeArticulo/:id_artic', ClienteController.getPaginaArticuloParaContinuarCompra)
// router.get('/paraCompra/:id_empresasucursal', ClienteController.getAllParaCompra);

export default router;