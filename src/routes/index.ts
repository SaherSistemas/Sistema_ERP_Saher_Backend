import { Router } from "express";
import paisRouter from '../routes/Lugares/paisRouter'
import estadoRouter from '../routes/Lugares/estadoRouter'
import ciudadRouter from '../routes/Lugares/ciudadRouter'
import coloniaRouter from '../routes/Lugares/coloniaRouter'


import proveedorRouter from './Proveedores/proveedorRouter'
import proveedor_empresaRouter from './Proveedores/proveedor_empresaRouter'


import listados_proveedorRouter from './Proveedores/listados_proveedorRouter'
import unidad_medidaRouter from '../routes/Articulos/UnidadMedidaRouter'
import temporabilidadRouter from '../routes/Articulos/TemporabilidadRouter'
import tipoArticuloRouter from '../routes/Articulos/Tipo_ArticuloRouter'
import categori_ArticuloRouter from '../routes/Articulos/Categoria_ArticuloRouter'
import subcategoriaRouter from '../routes/Articulos/SubCategoria_ArticuloRouter'

import articuloRouter from '../routes/Articulos/ArticuloRouter'
import tipo_ArticuloRouter from '../routes/Articulos/Prioridad_ArticuloRouter'

import empleadoRouter from './Usuarios/EmpleadoRouter'
import rolRouter from './Usuarios/RolRouter'
import usuarioRouter from './Usuarios/UsuarioRouter'


import cat_Regimen_fiscalRouter from './Catalogos/Cat_Regimen_FiscalRouter'
import cat_Tipo_ContratoRouter from './Catalogos/Cat_Tipo_ContratoRouter'
import cat_Tipo_JornadaRouter from './Catalogos/Cat_Tipo_JornadaRouter'
import cat_Periodicidad_PagoRouter from './Catalogos/Cat_Periodicidad_PagoRouter'
import cat_BancoRouter from './Catalogos/Cat_BancoRouter'
import cat_RiesgoPuestoRouter from './Catalogos/Cat_Riesgo_Puesto'

import tipoIVARouter from './Articulos/Tipo_IVARouter'

import empresa_SucursalRouter from './Empresa_Sucursal/Empresa_SucursalRouter'


import parametos_CompraRouter from './Compras/parametros_CompraRouter'
import comprasRouter from './Compras/comprasRouter'
import detalleCompraRouter from './Compras/detalle_CompraRouter'


import ClienteMostradorRouter from './VentasMostrador/ClienteMostradorRouter'

import lotesSolicitadoRouter from './LotesYCaducidades/LotesSolicitadoCompraRouter'

import factura_compra_ProveedorRouter from './Proveedores/facturas_Compra_ProveedorRouter'
const router = Router();


router.use('/pais', paisRouter)
router.use('/estado', estadoRouter)
router.use('/ciudad', ciudadRouter)
router.use('/colonia', coloniaRouter)


router.use('/proveedor', proveedorRouter)
router.use('/proveedor_empresa', proveedor_empresaRouter)

router.use('/listadosproveedor', listados_proveedorRouter)



router.use('/cat_regimen_fiscal', cat_Regimen_fiscalRouter)
router.use('/cat_tipo_contrato', cat_Tipo_ContratoRouter)
router.use('/cat_tipo_jornada', cat_Tipo_JornadaRouter)
router.use('/cat_periodicidad_pago', cat_Periodicidad_PagoRouter)
router.use('/cat_riesgo_puesto', cat_RiesgoPuestoRouter)
router.use('/cat_bancos', cat_BancoRouter)


router.use('/empleado', empleadoRouter)
router.use('/rol', rolRouter)
router.use('/usuario', usuarioRouter)

router.use('/tipo_iva', tipoIVARouter)
router.use('/unidadmedida', unidad_medidaRouter)
router.use('/temporabilidad', temporabilidadRouter)
router.use('/tipo_articulo', tipoArticuloRouter)
router.use('/categoria_articulo', categori_ArticuloRouter)
router.use('/presentacion_articulo', subcategoriaRouter)
router.use('/articulo', articuloRouter)
router.use('/prioridades_articulo', tipo_ArticuloRouter)


router.use('/empresas_sucursal', empresa_SucursalRouter)


router.use('/parametros_compra', parametos_CompraRouter)
router.use('/compras', comprasRouter)
router.use('/compras/detalle_compra', detalleCompraRouter)


router.use('/ClienteMostrador', ClienteMostradorRouter)
router.use('/lotes_solicitados', lotesSolicitadoRouter)


router.use('/facturas_proveedor', factura_compra_ProveedorRouter)
export default router