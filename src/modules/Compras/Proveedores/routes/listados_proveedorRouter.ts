import { Router } from "express";
import { Listado_ProveedorController } from "../controllers/Listado_ProveedorController"
import multer from "multer";

const router = Router()
const upload = multer({ dest: "uploads/" })

router.get('/proveedoresConListados', Listado_ProveedorController.getAllProveedoresConListado)
router.get('/obtenerProducto/:cod_barra_pro_detlist', Listado_ProveedorController.getProductPorProveedorListado)
router.get('/buscarProductosLista', Listado_ProveedorController.buscarProductosEnTodosLosListados)
router.post('/upload', upload.single('file'), Listado_ProveedorController.cargarListadosProveedor)


export default router;