import { Router } from "express";
import { Proyeccion_VentaController } from "../../controllers/Proyecciones/Proyeccion_VentaController";
const router = Router()

// Va antes de '/venta/:id_artic/:ventana_dias' para que "farmacias" no se tome como id de artículo
router.post('/venta/farmacias/:cod_int_artic', Proyeccion_VentaController.getVentasPorFarmacia)

router.post('/venta/:id_artic/:ventana_dias', Proyeccion_VentaController.getProyeccionVenta)

//PRUBEAS POLYSOFT 
router.post('/venta/pruebas/:cod_int_artic/:ventana_dias', Proyeccion_VentaController.getProyeccionVentaPruebas)
export default router;