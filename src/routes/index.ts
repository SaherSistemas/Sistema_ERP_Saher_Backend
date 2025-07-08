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
import permisoRouter from './Usuarios/PermisoRouter'
import permisoRolRouter from './Usuarios/Permiso_RolRouter'


import cat_Regimen_fiscalRouter from './Catalogos/Cat_Regimen_FiscalRouter'
import cat_Tipo_ContratoRouter from './Catalogos/Cat_Tipo_ContratoRouter'
import cat_Tipo_JornadaRouter from './Catalogos/Cat_Tipo_JornadaRouter'
import cat_Periodicidad_PagoRouter from './Catalogos/Cat_Periodicidad_PagoRouter'
import cat_BancoRouter from './Catalogos/Cat_BancoRouter'
import cat_RiesgoPuestoRouter from './Catalogos/Cat_Riesgo_Puesto'

import tipoIVARouter from './Articulos/Tipo_IVARouter'

import empresa_SucursalRouter from './Empresa_Sucursal/Empresa_SucursalRouter'


import parametos_CompraRouter from './Compras/parametros_CompraRouter'
import comprasRouter from './Compras/ComprasRouter'
import detalleCompraRouter from './Compras/detalle_CompraRouter'


import lotesSolicitadoRouter from './LotesYCaducidades/LotesSolicitadoCompraRouter'

//Clientes
import ClienteMostradorRouter from './Clientes/ClienteRouter'
import TipoClienteRouter from './Clientes/TipoClienteRouter'
import BeneficioClienteRouter from './Clientes/BeneficioClienteRouter'

//Caja
import MetodoPagoRouter from './Caja/Metodo_de_PagoRouter'
import Movimiento_CajaRouter from './Caja/Movimiento_CajaRouter';
import ParametroCajaRouter from './Caja/Parametro_CajaRouter';
import CajaRouter from './Caja/CajaRouter';
import Corte_CajaRoueter from './Caja/Corte_CajaRouter';



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
router.use('/permiso', permisoRouter)
router.use('/permiso_rol', permisoRolRouter)



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


router.use('/lotes_solicitados', lotesSolicitadoRouter)


router.use('/ClienteMostrador', ClienteMostradorRouter)
router.use('/tipo_cliente', TipoClienteRouter)
router.use('/beneficio_cliente', BeneficioClienteRouter)



// Caja
router.use('/metodo_pago', MetodoPagoRouter)
router.use('/movimiento_caja', Movimiento_CajaRouter)
router.use('/parametro_caja', ParametroCajaRouter)
router.use('/caja', CajaRouter)
router.use('/corte_caja', Corte_CajaRoueter)


router.use('/facturas_proveedor', factura_compra_ProveedorRouter)
export default router