import { Router } from 'express';
import paisRouter from '../routes/Lugares/paisRouter';
import estadoRouter from '../routes/Lugares/estadoRouter';
import ciudadRouter from '../routes/Lugares/ciudadRouter';
import coloniaRouter from '../routes/Lugares/coloniaRouter';

import proveedorRouter from '../modules/Compras/Proveedores/routes/proveedorRouter';
import proveedor_empresaRouter from '../modules/Compras/Proveedores/routes/proveedor_empresaRouter';

import listados_proveedorRouter from '../modules/Compras/Proveedores/routes/listados_proveedorRouter';
import unidad_medidaRouter from '../modules/Catalogos/routes/UnidadMedidaRouter';
import temporabilidadRouter from '../modules/Catalogos/Articulos/routes/TemporabilidadRouter';
import tipoArticuloRouter from '../modules/Catalogos/Articulos/routes/Tipo_ArticuloRouter';
import categori_ArticuloRouter from '../modules/Catalogos/Articulos/routes/Categoria_ArticuloRouter';
import subcategoriaRouter from '../modules/Catalogos/Articulos/routes/SubCategoria_ArticuloRouter';

import articuloRouter from '../modules/Catalogos/Articulos/routes/ArticuloRouter';
import tipo_ArticuloRouter from '../modules/Catalogos/Articulos/routes/Prioridad_ArticuloRouter';

import empleadoRouter from '../modules/RRHH/routes/EmpleadoRouter';
import rolRouter from '../modules/Seguridad/routes/RolRouter';
import usuarioRouter from '../modules/Seguridad/routes/UsuarioRouter';
import authRouter from '../modules/Seguridad/auth/AuthRouter';
import permisoRouter from '../modules/Seguridad/routes/PermisoRouter';
import permisoRolRouter from '../modules/Seguridad/routes/Permiso_RolRouter';
import permisoUsuarioRouter from '../modules/Seguridad/routes/Permiso_UsuarioRouter';

import agenteRouter from '../modules/Comercial/Agente_Venta/routes/AgenteRouter';
import Presupuesto_AgenteRouter from '../modules/Comercial/Agente_Venta/routes/Presupuesto_AgenteRouter';
import PrioridadAgenteRouter from '../modules/Comercial/Agente_Venta/routes/PrioridadAgenteReglasRouter';
import ComisionReglaAgenteRouter from '../modules/Comercial/Agente_Venta/routes/Comision_Regla_AgenteRouter';

import cat_Regimen_fiscalRouter from '../modules/Catalogos/routes/Cat_Regimen_FiscalRouter';
import cat_Tipo_ContratoRouter from '../modules/Catalogos/routes/Cat_Tipo_ContratoRouter';
import cat_Tipo_JornadaRouter from '../modules/Catalogos/routes/Cat_Tipo_JornadaRouter';
import cat_Periodicidad_PagoRouter from '../modules/Catalogos/routes/Cat_Periodicidad_PagoRouter';
import cat_BancoRouter from '../modules/Catalogos/routes/Cat_BancoRouter';
import cat_RiesgoPuestoRouter from '../modules/Catalogos/routes/Cat_Riesgo_Puesto';
import cat_forma_de_pagoRouter from '../modules/Catalogos/routes/Cat_Forma_De_PagoRouter';
import cat_uso_CFDIRouter from '../modules/Catalogos/routes/Cat_Uso_CFDIRouter';
import cat_metodo_pagoRouter from '../modules/Catalogos/routes/Cat_Metodo_De_PagoRouter';

import catalogosRouter from '../modules/Catalogos/routes/CatalagosRouter';

import tipoIVARouter from '../modules/Catalogos/Articulos/routes/Tipo_IVARouter';

import empresa_SucursalRouter from './Empresa_Sucursal/Empresa_SucursalRouter';
import grupo_EmpresaRouter from './Empresa_Sucursal/grupo_EmpresaSucursalRouter';
import grupoEmpresaListaPrecioRouter from '../modules/Comercial/Precios/routes/Grupo_Empresa_Lista_PrecioRouter';

import detalleCompraNegadoRouter from '../modules/Compras/Ordenes-Compra/routes/detalle_Compra_NegadoRouter';
import detalleCompraRecibidoRouter from '../modules/Compras/Ordenes-Compra/routes/detalle_Compra_RecibidoRouter';
import parametos_CompraRouter from '../modules/Compras/Ordenes-Compra/routes/parametros_CompraRouter';
import comprasRouter from '../modules/Compras/Ordenes-Compra/routes/ComprasGeneralRouter';
import comprasProveedorRouter from '../modules/Compras/Ordenes-Compra/routes/ComprasProveedorRouter';
import detalle_CompraRouter from '../modules/Compras/Ordenes-Compra/routes/detalle_CompraRouter';

import factura_compra_ProveedorRouter from '../modules/Finanzas/Cuentas_Por_Pagar/routes/facturas_Compra_ProveedorRouter';

import Margen_Ganancia_ListaRouter from '../modules/Comercial/Precios/routes/Margen_Ganancia_ListaRouter';


import notaCreditoRouter from './Devoluciones_NC/notaCreditoRouter';

import Dash_ComprasRouter from './Dashboards/DashboardRouter';

import ProyecionRouter from './Proyecciones/ProyecionRouter';
//PRUEBA DE CAMBIOS
//Lotes y Caducidades
import lotesSolicitadoRouter from './LotesYCaducidades/LotesSolicitadoCompraRouter';

//Clientes
import ClienteMostradorRouter from './Clientes/ClienteRouter';
import TipoClienteRouter from './Clientes/TipoClienteRouter';
import BeneficioClienteRouter from './Clientes/BeneficioClienteRouter';
import MonederoRouter from './Clientes/Monedero/MonederoRouter';

//Caja
import MetodoPagoRouter from './Caja/Metodo_de_PagoRouter';
import Movimiento_CajaRouter from './Caja/Movimiento_CajaRouter';
import ParametroCajaRouter from './Caja/Parametro_CajaRouter';
import CajaRouter from './Caja/CajaRouter';
import Corte_CajaRouter from './Caja/Corte_CajaRouter';

//Stock
import Stock_SucursalRouter from './Stock/Stock_SucursalRouter';

//Lotes Sucursal
import Lote_ArticuloSucursalRouter from '../modules/Inventario/Lotes/routes/Lote_ArticuloSucursalRouter';
import Lote_Usado_VentaRouter from './LotesYCaducidades/Lote_Usado_VentaRouter';

//Venta
import Detalle_VentaRouter from './Venta/Detalle_VentaRouter';
import VentaRouter from './Venta/VentaRouter';
import Venta_PagoRouter from './Venta/Venta_PagoRouter';

//Lista Precios
import Lista_Precio from '../modules/Comercial/Precios/routes/Lista_PrecioRouter';
import DetalleLista_Precio from '../modules/Comercial/Precios/routes/Detalle_Lista_PrecioRouter';

//Oferta
import OfertasRouter from './Ofertas/OfertasRouter';
import AlcanceOfertasRouter from './Ofertas/AlcanceOfertasRouter';
import UsoOfertasRouter from './Ofertas/UsoOfertaRouter';
import ReglaOfertaRouter from './Ofertas/ReglaOfertaRouter';

//Recetas Medicas
import RecetaMedicaRouter from './RecetaMedica/RecetaMedicaRouter';
import MedicoRouter from './RecetaMedica/MedicoRouter';
import RecetaArticuloRouter from './RecetaMedica/RecetaArticuloRouter';

//Calendario_Horario
import { authLimiter, generalLimiter } from '../config/limiter';

//Presupuesto
import Presupuesto_EmpresaRouter from './Presupuestos/Presupuesto_EmpresaRouter';
import Presupuesto_EmpleadoRouter from './Presupuestos/Presupuesto_EmpleadoRouter';
import Asignacion_Empleado_SucursalRouter from './Presupuestos/Asignacion_Empleado_SucursalRouter';

import Cliente_AlmacenRouter from './Clientes/Cliente_Almacen/Cliente_AlmacenRouter';
import Pedido_AlmacenRouter from '../modules/Almacen/Pedido/routes/Pedido_AlmecenRouter';


import cxcRoutes from '../modules/Finanzas/Cuentas_Por_Pagar/routes/index.route';
import remisionRouter from '../modules/Finanzas/Remisiones/routes/RemisionRouter';
import cxcClienteRouter from '../modules/Finanzas/Cuentas_Por_Cobrar/routes/CxCRouter';



import uploadsRouter from '../modules/Uploads/routes/UploadsRouter';

import almacenRouter from '../modules/Almacen/router'
import facturacionRouter from '../modules/Facturas/routes/FacturacionRouter'

import comercialRouter from '../modules/Comercial/router'

import impresionesRouter from '../modules/Impresiones/router'
import inventarioRouter from '../modules/Inventario/router'
const router = Router();

router.use(generalLimiter);

router.use('/pais', paisRouter);
router.use('/estado', estadoRouter);
router.use('/ciudad', ciudadRouter);
router.use('/colonia', coloniaRouter);

router.use('/proveedor', proveedorRouter);
router.use('/proveedor_empresa', proveedor_empresaRouter);

router.use('/listadosproveedor', listados_proveedorRouter);

router.use('/cat_regimen_fiscal', cat_Regimen_fiscalRouter);
router.use('/cat_tipo_contrato', cat_Tipo_ContratoRouter);
router.use('/cat_tipo_jornada', cat_Tipo_JornadaRouter);
router.use('/cat_periodicidad_pago', cat_Periodicidad_PagoRouter);
router.use('/cat_riesgo_puesto', cat_RiesgoPuestoRouter);
router.use('/cat_bancos', cat_BancoRouter);
router.use('/cat_forma_de_pago', cat_forma_de_pagoRouter);
router.use('/cat_usoCFDI', cat_uso_CFDIRouter);
router.use('/cat_metodo_de_pago', cat_metodo_pagoRouter);

router.use('/catalogos', catalogosRouter);
//Usuario
router.use('/empleado', empleadoRouter);
router.use('/rol', rolRouter);
router.use('/usuario', usuarioRouter);

router.use('/agente', agenteRouter);
router.use('/presupuesto_agente', Presupuesto_AgenteRouter);
router.use('/prioridad_agente', PrioridadAgenteRouter);
router.use('/comision-reglas', ComisionReglaAgenteRouter);

router.use('/permiso', permisoRouter);
router.use('/permiso_rol', permisoRolRouter);
router.use('/permiso_usuario', permisoUsuarioRouter);
router.use('/auth', authLimiter, authRouter);

router.use('/tipo_iva', tipoIVARouter);
router.use('/unidadmedida', unidad_medidaRouter);
router.use('/temporabilidad', temporabilidadRouter);
router.use('/tipo_articulo', tipoArticuloRouter);
router.use('/categoria_articulo', categori_ArticuloRouter);
router.use('/presentacion_articulo', subcategoriaRouter);
router.use('/articulo', articuloRouter);
router.use('/prioridades_articulo', tipo_ArticuloRouter);

router.use('/empresas_sucursal', empresa_SucursalRouter);
router.use('/grupo_empresa', grupo_EmpresaRouter);
router.use('/grupo_empresa_lista_precio', grupoEmpresaListaPrecioRouter);

router.use('/parametros_compra', parametos_CompraRouter);

router.use('/compras', comprasRouter);
router.use('/compras_proveedor', comprasProveedorRouter);
router.use('/compras/detalle_compra', detalle_CompraRouter);

router.use('/compras/detalle_compra_negado', detalleCompraNegadoRouter);
router.use('/compras/detalle_compra_recibido', detalleCompraRecibidoRouter);

router.use('/margen_ganancia_lista', Margen_Ganancia_ListaRouter);

router.use('/lotes_solicitados', lotesSolicitadoRouter);

// CLIENTES


router.use('/cliente', ClienteMostradorRouter);
router.use('/cliente_almacen', Cliente_AlmacenRouter);
router.use('/tipo_cliente', TipoClienteRouter);
router.use('/beneficio', BeneficioClienteRouter);

router.use('/monedero', MonederoRouter);
// router.use('/MovimientoMonedero', MonederoRouter);

//Recetas Medicas
router.use('/recetamedica', RecetaMedicaRouter);
router.use('/medico', MedicoRouter);
router.use('/receta_articulo', RecetaArticuloRouter);

// Caja
router.use('/metodo_pago', MetodoPagoRouter);
router.use('/movimiento_caja', Movimiento_CajaRouter);
router.use('/parametro_caja', ParametroCajaRouter);
router.use('/caja', CajaRouter);
router.use('/corte_caja', Corte_CajaRouter);

router.use('/movimiento_caja', Movimiento_CajaRouter);

//Stock
router.use('/stock', Stock_SucursalRouter);

//Lote sucursal
router.use('/lote_sucursal', Lote_ArticuloSucursalRouter);
router.use('/lote_usado_venta', Lote_Usado_VentaRouter);

//Venta
router.use('/detalle_venta', Detalle_VentaRouter);
router.use('/venta', VentaRouter);
router.use('/ventapago', Venta_PagoRouter);

//Lista Precios
router.use('/lista_Precio', Lista_Precio);
router.use('/detalle_lista_precio', DetalleLista_Precio);

//Ofertas
router.use('/oferta', OfertasRouter);
router.use('/alcanceOferta', AlcanceOfertasRouter);
router.use('/usoOferta', UsoOfertasRouter);
router.use('/reglaOferta', ReglaOfertaRouter);

//Presupuesto
router.use('/presupuesto_empresa', Presupuesto_EmpresaRouter);
router.use('/presupuesto_empleado', Presupuesto_EmpleadoRouter);
router.use('/asignacion_empleado_sucursal', Asignacion_Empleado_SucursalRouter);


router.use('/finanzas', cxcRoutes);
router.use('/finanzas/remisiones', remisionRouter);
router.use('/finanzas/cxc', cxcClienteRouter);

router.use('/nota_credito', notaCreditoRouter);

router.use('/dashboard', Dash_ComprasRouter);

router.use('/proyeccion', ProyecionRouter);

//! ALMACEN

router.use('/uploads', uploadsRouter)

router.use('/almacen', almacenRouter)
router.use('/inventario', inventarioRouter)
router.use('/facturas', facturacionRouter)

router.use('/comercial', comercialRouter)


router.use('/impresiones', impresionesRouter);
export default router;
