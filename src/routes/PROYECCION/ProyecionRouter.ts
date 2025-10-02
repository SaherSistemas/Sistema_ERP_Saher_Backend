import { Router } from "express";
import { Proyeccion_VentaController } from "../../controllers/Proyeccion/Proyeccion_VentaController";
const router = Router()

router.post('/venta/:id_artic/:ventana_dias', Proyeccion_VentaController.getProyeccionVenta)

//PRUBEAS POLYSOFT 
router.post('/venta/pruebas/:cod_int_artic/:ventana_dias', Proyeccion_VentaController.getProyeccionVentaPruebas)
export default router;