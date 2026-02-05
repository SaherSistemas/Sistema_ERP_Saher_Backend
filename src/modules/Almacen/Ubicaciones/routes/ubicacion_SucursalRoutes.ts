import { Router } from "express";
import { Ubicacion_SucursalController } from "../controllers/Ubicacion_SucursalController";

import { Ubicacion_ArticuloController } from "../controllers/Ubicacion_ArticuloController";

const router = Router()

router.get('/', Ubicacion_SucursalController.getAll)
router.post("/", Ubicacion_SucursalController.create);


// ===== UBICACIONES POR ARTÍCULO =====
router.get('/por-articulo/:id_articulo', Ubicacion_ArticuloController.getByIDArticulo);



export default router;