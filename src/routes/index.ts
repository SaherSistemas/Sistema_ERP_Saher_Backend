import { Router } from "express";
import paisRouter from '../routes/Lugares/paisRouter'
import estadoRouter from '../routes/Lugares/estadoRouter'
import ciudadRouter from '../routes/Lugares/ciudadRouter'
import proveedorRouter from './Proveedores/proveedorRouter'
import listados_proveedorRouter from './Proveedores/listados_proveedorRouter'
import unidad_medidaRouter from '../routes/Articulos/UnidadMedidaRouter'
import empleadoRouter from './Usuarios/EmpleadoRouter'
import cat_Regimen_fiscalRouter from './Catalogos/Cat_Regimen_FiscalRouter'
import cat_Tipo_ContratoRouter from './Catalogos/Cat_Tipo_ContratoRouter'
import cat_Tipo_JornadaRouter from './Catalogos/Cat_Tipo_JornadaRouter'
import cat_Periodicidad_PagoRouter from './Catalogos/Cat_Periodicidad_PagoRouter'
import cat_BancoRouter from './Catalogos/Cat_BancoRouter'

const router = Router();


router.use('/pais', paisRouter)
router.use('/estado', estadoRouter)
router.use('/ciudad', ciudadRouter)
router.use('/proveedor', proveedorRouter)
router.use('/listadosproveedor', listados_proveedorRouter)
router.use('/unidadmedida', unidad_medidaRouter)
router.use('/empleados', empleadoRouter)
router.use('/cat_regimen_fiscal', cat_Regimen_fiscalRouter)
router.use('/cat_tipo_contrato', cat_Tipo_ContratoRouter)
router.use('/cat_tipo_jornada', cat_Tipo_JornadaRouter)
router.use('/cat_periodicidad_pago', cat_Periodicidad_PagoRouter)
router.use('/cat_bancos', cat_BancoRouter)

export default router