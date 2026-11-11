import { Router } from "express";
import { NotasCreditoController } from "../../controllers/Devolucion_NC/NotasCreditoController";

import { authMiddleware } from "../../middleware/auth";
const router = Router();

router.post("/", NotasCreditoController.createNotaCredito);
router.get("/productos_pendientes/:compraId", NotasCreditoController.getProductosPendientes);
router.get("/productos_pendientes_factura/:facturaId", NotasCreditoController.getProductosPendientesByFactura);
router.get("/ingresados_factura/:facturaId", NotasCreditoController.getIngresadosByFactura);
router.post("/dar_entrada_inventario", authMiddleware, NotasCreditoController.darEntradaInventario);


export default router;
