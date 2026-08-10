import { Router } from "express";
import { Dash_CompraController } from "../../controllers/Dashboard/DashboardController";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.get("/compras/kpis/:empresaId", Dash_CompraController.getAllKpisCompras);
router.get("/compras/conFiltro/:id_empresa", Dash_CompraController.getAllComprasConFiltro);
router.get("/operaciones/kpis", authMiddleware, Dash_CompraController.getKpisOperaciones);
router.get("/operaciones/dias-inventario", authMiddleware, Dash_CompraController.getDiasInventario);
router.get("/operaciones/presupuestos-agentes", authMiddleware, Dash_CompraController.getPresupuestosAgentes);

export default router;
