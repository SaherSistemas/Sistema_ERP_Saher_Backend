import { Router } from "express";
import { Dash_CompraController } from "../../controllers/Dashboard/DashboardController";

const router = Router();

// 🔹 Obtener todos
router.get("/compras/kpis/:empresaId", Dash_CompraController.getAllKpisCompras);

router.get("/compras/conFiltro/:id_empresa", Dash_CompraController.getAllComprasConFiltro);

export default router;
