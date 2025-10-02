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


import agenteRouter from './Usuarios/Agente_De_Venta/AgenteRouterController'


import cat_Regimen_fiscalRouter from './Catalogos/Cat_Regimen_FiscalRouter'
import cat_Tipo_ContratoRouter from './Catalogos/Cat_Tipo_ContratoRouter'
import cat_Tipo_JornadaRouter from './Catalogos/Cat_Tipo_JornadaRouter'
import cat_Periodicidad_PagoRouter from './Catalogos/Cat_Periodicidad_PagoRouter'
import cat_BancoRouter from './Catalogos/Cat_BancoRouter'
import cat_RiesgoPuestoRouter from './Catalogos/Cat_Riesgo_Puesto'

import tipoIVARouter from './Articulos/Tipo_IVARouter'

import empresa_SucursalRouter from './Empresa_Sucursal/Empresa_SucursalRouter'
import grupo_EmpresaRouter from './Empresa_Sucursal/grupo_EmpresaSucursalRouter'
import grupoEmpresaListaPrecioRouter from './Costo_y_Precio/Grupo_Empresa_Lista_PrecioRouter'


import detalleCompraNegadoRouter from './Compras/detalle_Compra_NegadoRouter'
import detalleCompraRecibidoRouter from './Compras/detalle_Compra_RecibidoRouter'
import parametos_CompraRouter from './Compras/parametros_CompraRouter'
import comprasRouter from './Compras/ComprasGeneralRouter'
import comprasProveedorRouter from './Compras/ComprasProveedorRouter'
import detalle_CompraRouter from './Compras/detalle_CompraRouter'



//Lotes y Caducidades
import lotesSolicitadoRouter from './LotesYCaducidades/LotesSolicitadoCompraRouter'

//Clientes
import ClienteRouter from './Clientes/ClienteRouter'
import ClienteMostradorRouter from './Clientes/ClienteRouter'
import TipoClienteRouter from './Clientes/TipoClienteRouter'
import BeneficioClienteRouter from './Clientes/BeneficioClienteRouter'
import MonederoRouter from './Clientes/Monedero/MonederoRouter'
//Caja
import MetodoPagoRouter from './Caja/Metodo_de_PagoRouter'
import Movimiento_CajaRouter from './Caja/Movimiento_CajaRouter';
import ParametroCajaRouter from './Caja/Parametro_CajaRouter';
import CajaRouter from './Caja/CajaRouter';
import Corte_CajaRouter from './Caja/Corte_CajaRouter';

//Stock
import Stock_SucursalRouter from "./Stock/Stock_SucursalRouter"

//Lotes Sucursal
import Lote_ArticuloSucursalRouter from "./LotesYCaducidades/Lote_ArticuloSucursalRouter"
import Lote_Usado_VentaRouter from "./LotesYCaducidades/Lote_Usado_VentaRouter"

//Venta
import Detalle_VentaRouter from "./Venta/Detalle_VentaRouter"
import VentaRouter from "./Venta/VentaRouter"
import Venta_PagoRouter from "./Venta/Venta_PagoRouter"

//Lista Precios
import Lista_Precio from "./Costo_y_Precio/Lista_Precio/Lista_PrecioRouter"
import DetalleLista_Precio from "./Costo_y_Precio/Lista_Precio/Detalle_Lista_PrecioRouter"

//Oferta
import OfertasRouter from "./Ofertas/OfertasRouter";
import AlcanceOfertasRouter from "./Ofertas/AlcanceOfertasRouter";
import UsoOfertasRouter from "./Ofertas/UsoOfertaRouter";
import ReglaOfertaRouter from "./Ofertas/ReglaOfertaRouter";


//Recetas Medicas
import RecetaMedicaRouter from './RecetaMedica/RecetaMedicaRouter'
import MedicoRouter from "./RecetaMedica/MedicoRouter";
import RecetaArticuloRouter from "./RecetaMedica/RecetaArticuloRouter";



import factura_compra_ProveedorRouter from './Proveedores/facturas_Compra_ProveedorRouter'

import Margen_Ganancia_ListaRouter from './Costo_y_Precio/Margen_Ganancia_ListaRouter'


import DevolucionesRouter from './Devoluciones_NC/DevolucionesRouter'
import notaCreditoRouter from './Devoluciones_NC/notaCreditoRouter'

import Dash_ComprasRouter from "./Dashboards/DashboardRouter";

import ProyecionRouter from './Proyeccion/ProyecionRouter'

<<<<<<< HEAD

=======
>>>>>>> db04f13f40e49ec555c9a79b77cf997bcf9f2c1d
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

//Usuario
router.use('/empleado', empleadoRouter)
router.use('/rol', rolRouter)
router.use('/usuario', usuarioRouter)
router.use('/agente', agenteRouter)
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
router.use('/grupo_empresa', grupo_EmpresaRouter)
router.use('/grupo_empresa_lista_precio', grupoEmpresaListaPrecioRouter)

router.use('/parametros_compra', parametos_CompraRouter)

router.use('/compras', comprasRouter)
router.use('/compras_proveedor', comprasProveedorRouter)
router.use('/compras/detalle_compra', detalle_CompraRouter)

router.use('/compras/detalle_compra_negado', detalleCompraNegadoRouter)
router.use('/compras/detalle_compra_recibido', detalleCompraRecibidoRouter)

router.use('/margen_ganancia_lista', Margen_Ganancia_ListaRouter)

router.use('/lotes_solicitados', lotesSolicitadoRouter)


router.use('/cliente', ClienteRouter)
router.use('/cliente', ClienteMostradorRouter)
router.use('/tipo_cliente', TipoClienteRouter)
router.use('/beneficio', BeneficioClienteRouter)


router.use('/monedero', MonederoRouter)



//Recetas Medicas
router.use('/recetamedica', RecetaMedicaRouter)
router.use('/medico', MedicoRouter)
router.use('/receta_articulo', RecetaArticuloRouter)






// Caja
router.use('/metodo_pago', MetodoPagoRouter)
router.use('/movimiento_caja', Movimiento_CajaRouter)
router.use('/parametro_caja', ParametroCajaRouter)
router.use('/caja', CajaRouter)
router.use('/corte_caja', Corte_CajaRouter)


//Stock
router.use('/stock', Stock_SucursalRouter)

//Lote sucursal
router.use('/lote_sucursal', Lote_ArticuloSucursalRouter)
router.use('/lote_usado_venta', Lote_Usado_VentaRouter)

//Venta
router.use('/detalle_venta', Detalle_VentaRouter)
router.use('/venta', VentaRouter)
router.use('/ventapago', Venta_PagoRouter)


//Lista Precios
router.use('/lista_Precio', Lista_Precio)
router.use('/detalle_lista_precio', DetalleLista_Precio)

//Ofertas
router.use('/oferta', OfertasRouter)
router.use('/alcanceOferta', AlcanceOfertasRouter)
router.use('/usoOferta', UsoOfertasRouter)
router.use('/reglaOferta', ReglaOfertaRouter)




router.use('/facturas_proveedor', factura_compra_ProveedorRouter)

router.use('/devoluciones', DevolucionesRouter)
router.use('/nota_credito', notaCreditoRouter)

router.use('/dashboard', Dash_ComprasRouter)


router.use('/proyeccion', ProyecionRouter)
//router.use('/uploads/factura', uploadsRouter)
export default router