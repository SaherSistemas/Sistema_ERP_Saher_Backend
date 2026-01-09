import { v4 as uuidv4 } from 'uuid';
import { fn, literal, Op, Transaction } from 'sequelize';
import Articulo from '../../../models/Articulos/Articulo';

import Proveedor from '../../Proveedores/model/Proveedor';
import { ICreateCompra_Proveedor } from '../interface/Compra_Proveedor.interface';

import { Factura_Compra_ProveedorRepository } from '../../Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository';
import { EmpleadoRepository } from '../../../repository/Usuarios/Empleado.repository';
import { Sequelize } from 'sequelize-typescript';
import { CompraGeneralRepository } from './Compra_General.repository';
import { Detalle_Compra_RecibidosRepository } from './Detalle_Compra_Recibido.repository';
import { round2 } from '../../../utils/validaciones';
import Compra_Proveedor from '../model/Compra_Proveedor';
import Compra_General from '../model/Compra_General';
import Detalle_Compra_Solicitado from '../model/Detalle_Compra_Solicitado';
export type KpiEstados = { R: number; A: number; F: number; D: number };
export const Compra_ProveedorRepository = {
  /*
           Código	      Estado	                             Descripción
           C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
           A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
           E	        ENVIADA	                                 La orden ha sido enviada al proveedor.
           L            CAPTURANDO LOTES                         La compra se estan capturando los lotes.
           K            LOTES REGISTRADOS	                     Los lotes han sido registrados y se está esperando la recepción de los productos.
           R	        RECIBIDA	                             Todos los productos han sido recibidos correctamente.(ESPERANDO CHEQUEO Y CONTEO)
           H	        HACIENDO CHEQUEO	                     La mercancía fue recibida y se encuentra en proceso de verificación y conteo antes de cerrar la compra.
           Z            FIN CHEQUEO                              Fin chequeo pero no acomodado
           M	        MOVIENDO/ACOMODANDO                      La mercancía fue revisada y está en proceso de traslado y acomodo en su ubicación final.
           F	        COMPLETADA	                             Fue recibido y se cerró la compra.
           D            COMPLETADA PERO CON DEVOLUCION           La compra fue completada pero tiene devolucion.    
    */
  /*
   * ************************************************************
   * ************************COMPRA_PROVEEDOR*******************
   * ***********************************************************
   */

  getAllCompra_ProveedorPorIdCompGener: async (id_compra_general: string) => {
    return await Compra_Proveedor.findAll({
      where: { id_compra_general },
      include: [
        {
          model: Proveedor
        }
      ]
    });
  },

  actualizarTotalesCompraProveedor: async (id_comp: string, totalSinIva: number, totaliva: number, t?: Transaction) => {
    //AQUI SOLO SE HACE UPDATE DE LOS TOTALES DE LA COMPRA PROVEEDOR
    return await Compra_Proveedor.update({
      total_comp_factura: literal(`total_comp_factura + ${Number(totalSinIva)}`),
      total_iva_factura: literal(`total_iva_factura + ${Number(totaliva)}`)
    },
      {
        where: { id_comp },
        transaction: t
      });
  },

  getComprasPendientes: async () => {
    return await Compra_Proveedor.findAll({
      where: {
        estado_comp: 'D'
      },
      include: [{ model: Proveedor }]
    });
  },

  getDevolucionesPendientesPorIdCompGener: async (id_compra_general: string) => {
    return await Compra_Proveedor.findAll({
      where: { id_compra_general, estado_comp: 'D' },
      include: [{ model: Proveedor }]
    });
  },

  getAllCompras_ProveedorParaRecibir: async (id_empresa_sucursal: string) => {
    const comprasGenerales = await CompraGeneralRepository.getAllCompra_GeneralSinPaginar(id_empresa_sucursal);
    return await Compra_Proveedor.findAll({
      include: [Proveedor],
      where: {
        id_compra_general: comprasGenerales.map(compra => compra.id_compra_general),
        estado_comp: { [Op.ne]: 'F' }
      },
      order: [
        [Sequelize.literal('fecha_mercancia_recibida_proveedor IS NOT NULL'), 'ASC'], // NULL primero
        ['fecha_mercancia_recibida_proveedor', 'ASC'] // Luego fechas en orden ascendente
      ]
    });
  },

  marcarCompraProveedorComoRecibida: async (id_comp: string, id_empleado: string) => {
    const compraProveedor = await Compra_Proveedor.findByPk(id_comp);
    const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado);
    if (!compraProveedor) {
      throw new Error('Compra del proveedor no encontrada');
    }

    let seActualizoCompra = false;

    // Si aún no ha sido marcada como recibida, actualízala
    /*if (compraProveedor.fecha_mercancia_recibida_proveedor == null) {
      await compraProveedor.update({
        fecha_mercancia_recibida_proveedor: new Date(),
        estado_comp: 'R',
        id_empleado_recibio: empleado.id_empleado
      });
      seActualizoCompra = true;
    }
*/
    return {
      actualizado: seActualizoCompra
    };
  },
  iniciarChequeoDeCompraProveedor: async (id_comp: string, id_empleado: string) => {
    return
  },

  iniciarAcomodoDeCompraProveedor: async (id_comp: string, id_empleado: string) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp);
    const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado);

    if (!compraProveedor) {
      throw new Error('Compra del proveedor no encontrada');
    }
    let seActualizoCompra = false;


    return {

    };
  },
  finalizarAcomodoDeCompraProveedor: async (
    id_comp: string,
    id_empleado: string,
    options?: { transaction?: Transaction }
  ) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp);
    const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado);

    if (!compraProveedor) throw new Error('Compra del proveedor no encontrada');

    return {};
  },

  findCompraProveedor_CapturandoByProveedor: async (id_proveedor: string, id_empresa: string) => {
    return await Compra_Proveedor.findOne({
      where: {
        idprove_comp: id_proveedor,
        estado_comp: 'C' // o el que uses para 'Capturando'
      },
      include: [
        {
          model: Compra_General,
          where: {
            id_empresa_sucursal: id_empresa
          }
        }
      ]
    });
  },
  cambiarTotalFactura: async (id_comp: string) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp);
    //const id_compra_general = compraProveedor.id_compra_general
    const facturaProveedor = await Factura_Compra_ProveedorRepository.getByID(id_comp);
    //obtener detalles_recibidos
    const traerDetallesCompraRecibidos = await Detalle_Compra_RecibidosRepository.getArticulosRecibidos(id_comp);
    //console.log(traerDetallesCompraRecibidos)

    let subtotal = 0;
    let totalIva = 0;

    for (const det of traerDetallesCompraRecibidos) {
      const cantidad = Number(det.cantidad_detcomprec) || 0;
      const precio = Number(det.precio_detcomprec) || 0;
      const iva = Number(det.iva_detcomprec) || 0;

      subtotal += cantidad * precio;
      totalIva += cantidad * iva;
    }

    // await CompraGeneralRepository.updateTotalCompraGeneral(id_compra_general, subtotal, totalIva)

    await facturaProveedor.update({
      total_factura_proveedor: subtotal,
      total_iva_factura: totalIva
    });
    //  console.log(subtotal)

    return await compraProveedor.update({
      total_comp_factura: subtotal,
      total_iva_factura: totalIva
    });
  },

  cambiarTotalCompraGen: async (id_comp: string) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp);
    const id_compra_general = compraProveedor.id_compra_general;
    const facturaProveedor = await Factura_Compra_ProveedorRepository.getByID(id_comp);
    //obtener detalles_recibidos
    const traerDetallesCompraRecibidos = await Detalle_Compra_RecibidosRepository.getArticulosRecibidos(id_comp);
    //console.log(traerDetallesCompraRecibidos)

    let subtotal = 0;
    let totalIva = 0;

    for (const det of traerDetallesCompraRecibidos) {
      const cantidad = Number(det.cantidad_detcomprec) || 0;
      const precio = Number(det.precio_detcomprec) || 0;
      const iva = Number(det.iva_detcomprec) || 0;

      subtotal += cantidad * precio;
      totalIva += cantidad * iva;
    }

    await CompraGeneralRepository.updateTotalCompraGeneral(id_compra_general, subtotal, totalIva);

    await facturaProveedor.update({
      total_factura_proveedor: subtotal,
      total_iva_factura: totalIva
    });
  },
  getAllArticulosPorCompra: async (id_comp: string) => {
    return await Detalle_Compra_Solicitado.findAll({
      where: { idcompr_detcompsol: id_comp },
      include: [
        {
          model: Articulo
        },
        {
          model: Compra_Proveedor
        }
      ]
    });
  },
  getByID: async (id_comp: string, options?: { transaction?: Transaction }) => {
    const compraProveedor = await Compra_Proveedor.findByPk(id_comp, options);
    return compraProveedor;
  },
  addDetallesCompraSolicitado: async (id_compra: string, detalles: any[]) => {
    const detallesProcesados = await Promise.all(
      detalles.map(async detalle => {
        const existente = await Detalle_Compra_Solicitado.findOne({
          where: {
            idcompr_detcompsol: id_compra,
            idarticulo_detcompsol: detalle.idarticulo_detcompsol,
            precio_detcompsol: detalle.precio_detcompsol
          }
        });

        if (existente) {
          // Acumular la cantidad si ya existe
          existente.cantidad_detcompsol += detalle.cantidad_detcompsol;
          await existente.save();
          return existente;
        } else {
          // Crear nuevo si no existe
          return await Detalle_Compra_Solicitado.create({
            id_detcompsol: uuidv4(),
            idcompr_detcompsol: id_compra,
            ...detalle
          });
        }
      })
    );

    return detallesProcesados;
  },

  actualizarFechaEnviadaProveedor: async (id_comp: string) => {
    const compraProveedor = await Compra_Proveedor.findByPk(id_comp);

    if (!compraProveedor) {
      throw new Error('Compra del proveedor no encontrada');
    }

    if (compraProveedor.fecha_enviada_proveedor == null) {
      return await compraProveedor.update({
        fecha_enviada_proveedor: new Date(),
        estado_comp: 'E'
      });
    }

    // Si ya tenía fecha, simplemente retorna el objeto sin modificar
    return compraProveedor;
  },
  guardarFacturaEIniciarCapturaLotes: async (id_comp: string, folio_factura_compra: string) => {
    const compra = await Compra_ProveedorRepository.getByID(id_comp);
    compra.update({
      folio_factura_compra: folio_factura_compra,
      inicio_de_registro_lotes: new Date(),
      estado_comp: 'L'
    });
  },

  actualizarEstadoAlGuardarLotes: async (id_comp: string, id_empleado_registro_lotes: string) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp);
    const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado_registro_lotes);
    compraProveedor.update({
      fin_de_registro_lotes: new Date(),
      estado_comp: 'K',
      id_empleado_registro_lotes: empleado.id_empleado
    });
  },

  createCompraProveedor: async (data: ICreateCompra_Proveedor) => {
    const { idprove_comp, id_compra_general } = data;
    return await Compra_Proveedor.create({
      id_comp: uuidv4(),
      estado_comp: 'C',
      idprove_comp: idprove_comp,
      id_compra_general: id_compra_general,
      inicio_de_compra_proveedor: new Date()
    });
  },
  articulosDetalleCompraProveedor: async (id_comp: string) => {
    const compraProveedor = await Compra_Proveedor.findOne({
      where: { id_comp },
      attributes: ['id_comp'],
      include: [
        {
          model: Detalle_Compra_Solicitado,
          attributes: ['cantidad_detcompsol', 'precio_detcompsol'],
          include: [
            {
              model: Articulo,
              attributes: ['cod_int_artic', 'cod_barr_artic', 'des_artic']
            }
          ],
          required: false // evita LEFT JOIN innecesarios si no hay productos
        },
        {
          model: Proveedor,
          attributes: ['nomcort_prove', 'razsoc_prove', 'rfc_prove', 'telef_prove', 'corr_prove'],
          required: false
        }
      ]
    });

    return compraProveedor.get({ plain: true });
  },

  compraProveedorTerminarRecibida: async (
    id_comp: string,
    totalCompra: number,
    ivaRecibido: number,
    options?: { transaction?: Transaction }
  ) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp);
    const esCompleta = Number(compraProveedor.total_comp_factura) === round2(totalCompra);

    //ACTUALIZAR TOTAL_COMPRA GENERAL PARA TENER EL TOTAL QUE SE COMPRO MOVER A COMPRA GENERAL
    const cambiarTotalFactura = await Compra_ProveedorRepository.cambiarTotalCompraGen(id_comp);

    return await Compra_Proveedor.update(
      {
        total_comp_recibido: totalCompra,
        total_iva_recibido: ivaRecibido,
        fin_de_checado: new Date(), // ← siempre fecha de cierre de checado
        fin_de_compra_proveedor: esCompleta ? new Date() : null, // ← fecha de cierre definitiva SOLO si completa
        estado_comp: 'Z' // ojo: valida que 'Z' exista en tu catálogo de estados
      },
      {
        where: { id_comp },
        transaction: options?.transaction
      }
    );
  },

  comprasProveedorSinTerminar: async (id_compra_general: string, options?: { transaction?: Transaction }) => {
    const pendientes = await Compra_Proveedor.count({
      where: {
        id_compra_general,
        estado_comp: { [Op.ne]: 'F' } // cualquier estado que NO sea F
      },
      transaction: options?.transaction
    });

    return {
      pendientes, // número de compras proveedor que faltan
      todasTerminadas: pendientes === 0
    };
  },

  //KPIS
  getHijosPorEstado: async (whereCP: any): Promise<KpiEstados> => {
    const row = (await Compra_Proveedor.findOne({
      where: whereCP,
      include: [{ association: 'proveedor', attributes: [] }],
      attributes: [
        [fn('SUM', literal(`CASE WHEN estado_comp = 'R' THEN 1 ELSE 0 END`)), 'R'],
        [fn('SUM', literal(`CASE WHEN estado_comp = 'A' THEN 1 ELSE 0 END`)), 'A'],
        [fn('SUM', literal(`CASE WHEN estado_comp = 'F' THEN 1 ELSE 0 END`)), 'F'],
        [fn('SUM', literal(`CASE WHEN estado_comp = 'D' THEN 1 ELSE 0 END`)), 'D']
      ],
      raw: true
    })) as unknown as { R?: number; A?: number; F?: number; D?: number } | null;
    // console.log(row)
    return {
      R: Number(row?.R ?? 0),
      A: Number(row?.A ?? 0),
      F: Number(row?.F ?? 0),
      D: Number(row?.D ?? 0)
    };
  },

  updateEstado: async (id_comp: string, estado: string, options?: { transaction?: Transaction }) => {
    return await Compra_Proveedor.update(
      { estado_comp: estado },
      {
        where: { id_comp },
        transaction: options?.transaction
      }
    );
  }
};
