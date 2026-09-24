
import Compra_Proveedor from '../model/Compra_Proveedor';
import Compra_General from '../model/Compra_General';
import Detalle_Compra_Solicitado from '../model/Detalle_Compra_Solicitado';
import Proveedor from '../../Proveedores/model/Proveedor';

import { v4 as uuidv4 } from 'uuid';
import { fn, literal, Op, QueryTypes, Transaction } from 'sequelize';
import { ICreateCompra_Proveedor } from '../interface/Compra_Proveedor.interface';
import { Factura_Compra_ProveedorRepository } from '../../../Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository';
import { EmpleadoRepository } from '../../../RRHH/repositories/Empleado.repository';
import { Sequelize } from 'sequelize-typescript';
import { CompraGeneralRepository } from './Compra_General.repository';
import { Detalle_Compra_RecibidosRepository } from './Detalle_Compra_Recibido.repository';
import { round2 } from '../../../../utils/validaciones';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Tipo_IVA from '../../../Catalogos/Articulos/model/Tipo_IVA';
import Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import { Detalle_Compra_NegadosRepository } from './Detalle_Compra_Negado.repository';
export type KpiEstados = { R: number; A: number; F: number; D: number };
export const Compra_ProveedorRepository = {
  /*
           Código	      Estado	                             Descripción
           C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
           A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
           E	        ENVIADA	                                 La orden ha sido enviada al proveedor.
           R          REGISTRADA                            La compra se registró LOS LOTES Y YA NO HAY MAS PRODUCTOS QUE VENGAN
           

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
    const rows = await Compra_Proveedor.findAll({
      where: { id_compra_general },
      include: [
        {
          model: Proveedor
        }
      ]
    });

    // Importe pedido por proveedor (cantidad × precio, sin IVA). total_comp_factura
    // solo se llena al capturar facturas, así que antes de eso marcaba $0.
    if (rows.length > 0) {
      const pedidos = await Compra_Proveedor.sequelize!.query<{ id_comp: string; total_pedido: string }>(`
        SELECT d.idcompr_detcompsol AS id_comp,
               COALESCE(SUM(d.cantidad_detcompsol * d.precio_detcompsol), 0) AS total_pedido
        FROM detalle_compra_solicitado d
        WHERE d.idcompr_detcompsol IN (:ids)
        GROUP BY d.idcompr_detcompsol
      `, {
        type: QueryTypes.SELECT,
        replacements: { ids: rows.map(r => r.id_comp) },
      });
      const porComp = new Map(pedidos.map(p => [p.id_comp, Number(p.total_pedido)]));
      rows.forEach(r => r.setDataValue('total_pedido' as any, porComp.get(r.id_comp) ?? 0));
    }

    return rows;
  },

  // Vista plana "por proveedor": todos los renglones proveedor-orden de todas las
  // compras generales del rango de fechas, sin tener que abrir cada compra una por una.
  getTodasOrdenesPorProveedor: async (id_empresa: string, fechaInicio: string, fechaFin: string) => {
    const rows = await Compra_Proveedor.sequelize!.query<{
      id_comp: string; id_compra_general: string; estado_comp: string;
      fecha_enviada_proveedor: string | null; total_comp_factura: string; total_iva_factura: string;
      fecha_inicio: string; tipo_compra: string; fecha_fin_captura: string | null; fin_de_registro_lotes: string | null;
      id_prove: string; nomcort_prove: string;
      total_pedido: string;
    }>(`
      SELECT cp.id_comp, cp.id_compra_general, cp.estado_comp, cp.fecha_enviada_proveedor, cp.fin_de_registro_lotes,
             cp.total_comp_factura, cp.total_iva_factura,
             cg.fecha_inicio, cg.tipo_compra, cg.fecha_fin_captura,
             p.id_prove, p.nomcort_prove,
             COALESCE((
                 SELECT SUM(d.cantidad_detcompsol * d.precio_detcompsol)
                 FROM detalle_compra_solicitado d
                 WHERE d.idcompr_detcompsol = cp.id_comp
             ), 0) AS total_pedido
      FROM compra_proveedor cp
      JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
      JOIN proveedor p       ON p.id_prove = cp.idprove_comp
      WHERE cg.id_empresa_sucursal = :id_empresa
        AND cg.fecha_inicio::date BETWEEN :fecha_inicio AND :fecha_fin
      ORDER BY p.nomcort_prove ASC, cg.fecha_inicio DESC
    `, {
      type: QueryTypes.SELECT,
      replacements: { id_empresa, fecha_inicio: fechaInicio, fecha_fin: fechaFin },
    });

    return rows.map(r => {
      const pedido = Number(r.total_pedido);
      const facturado = Number(r.total_comp_factura) + Number(r.total_iva_factura);
      return {
        id_comp: r.id_comp,
        id_compra_general: r.id_compra_general,
        estado_comp: r.estado_comp,
        fecha_enviada_proveedor: r.fecha_enviada_proveedor,
        fecha_inicio: r.fecha_inicio,
        tipo_compra: r.tipo_compra,
        fecha_fin_captura: r.fecha_fin_captura,
        fin_de_registro_lotes: r.fin_de_registro_lotes,
        proveedor: { id_prove: r.id_prove, nomcort_prove: r.nomcort_prove },
        total: pedido > 0 ? pedido : facturado,
        total_pedido: pedido,
        total_facturado: facturado,
      };
    });
  },

  actualizarTotalesCompraProveedor: async (id_comp: string, totalSinIva: number, totaliva: number, t?: Transaction) => {
    return await Compra_Proveedor.update({
      total_comp_factura: literal(`total_comp_factura + ${Number(totalSinIva)}`),
      total_iva_factura: literal(`total_iva_factura + ${Number(totaliva)}`)
    }, { where: { id_comp }, transaction: t });
  },

  // Recalcula total_comp_factura y total_iva_factura sumando TODAS las facturas de esa compra.
  // Idempotente: siempre reemplaza en vez de acumular.
  recalcularTotalesDesdeFacturas: async (id_comp: string, t?: Transaction) => {
    const facturas = await Factura_Compra_Proveedor.findAll({
      where: { id_compra_prove_factura: id_comp },
      attributes: ['total_factura_proveedor', 'total_iva_factura'],
      transaction: t,
    });
    const totalSinIva = facturas.reduce((acc, f) => acc + Number(f.total_factura_proveedor ?? 0), 0);
    const totalIva = facturas.reduce((acc, f) => acc + Number(f.total_iva_factura ?? 0), 0);
    return await Compra_Proveedor.update(
      { total_comp_factura: totalSinIva, total_iva_factura: totalIva },
      { where: { id_comp }, transaction: t }
    );
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
  cuentaPorCompraGeneral: async (id_compra_general: string) => {
    return await Compra_Proveedor.count({
      where: { id_compra_general }
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
    t?: { transaction?: Transaction }
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
      const iva = 0; //ERA      const iva = Number(det.iva_detcomprec) || 0; 

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

  cambiarTotalCompraGen: async (id_comp: string, totalCompra: number, ivaRecibido: number, t?: Transaction) => {
    const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp, t);

    return await CompraGeneralRepository.updateTotalCompraGeneral(compraProveedor.id_compra_general, totalCompra, ivaRecibido, t);
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
  getByID: async (id_comp: string, t?: Transaction) => {
    const compraProveedor = await Compra_Proveedor.findByPk(id_comp, { transaction: t });
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
          attributes: ['id_detcompsol', 'cantidad_detcompsol', 'precio_detcompsol'],
          include: [
            {
              model: Articulo,
              attributes: ['cod_int_artic', 'cod_barr_artic', 'des_artic'],
              include: [{
                model: Tipo_IVA,
                attributes: ['porcentaje_iva'],
              }]
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
    t?: Transaction,
    sinDevoluciones: boolean = false,
  ) => {
    // Si el chequeo cerró sin faltantes/devoluciones no hace falta pasar por
    // "Capturar Lotes" aparte — se da por completada de una vez (F). Si quedó
    // algo negado/faltante, se queda en Z (fin de chequeo, pendiente de acomodar).
    return await Compra_Proveedor.update(
      {
        total_comp_recibido: totalCompra,
        total_iva_recibido: ivaRecibido,
        fin_de_checado: new Date(), // ← siempre fecha de cierre de checado
        fin_de_compra_proveedor: new Date(), // ← fecha de cierre definitiva
        estado_comp: sinDevoluciones ? 'F' : 'Z',
        ...(sinDevoluciones ? { fin_de_registro_lotes: new Date() } : {}),
      },
      {
        where: { id_comp },
        transaction: t
      }
    );
  },

  comprasProveedorSinTerminar: async (id_compra_general: string, t?: { transaction?: Transaction }) => {
    const pendientes = await Compra_Proveedor.count({
      where: {
        id_compra_general,
        estado_comp: { [Op.ne]: 'F' } // cualquier estado que NO sea F
      },
      transaction: t?.transaction
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

  updateEstado: async (id_comp: string, estado: string, t?: { transaction?: Transaction }) => {
    return await Compra_Proveedor.update(
      { estado_comp: estado },
      {
        where: { id_comp },
        transaction: t?.transaction
      }
    );
  },
  eliminarCompraProveedor: async (id_comp: string, t?: { transaction?: Transaction }) => {
    return await Compra_Proveedor.destroy({
      where: { id_comp },
      transaction: t?.transaction
    });
  },

  finalizarCapturaYRegistrarNegados: async (opts: {
    id_compra_proveedor: string;
    productosPendientes: { id_artic: string; cantidad_pendiente: number }[];
  }) => {
    const { id_compra_proveedor, productosPendientes } = opts;

    // Insertar negados si hay pendientes
    if (productosPendientes.length > 0) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 10); // fecha límite 10 días después de hoy

      const negados = productosPendientes.map((p) => ({
        id_detcompneg: uuidv4(),
        idcompr_detcompneg: id_compra_proveedor,
        idarticulo_detcompneg: p.id_artic,
        cantidad_negada: p.cantidad_pendiente,
        motivo_negado: 'Pendiente en captura de compra proveedor',
        recuperado: false,
        fecha_negado: new Date(),
        fecha_limite_recuperacion: fechaLimite,
      }));

      await Detalle_Compra_NegadosRepository.agregarProductosNegados(negados);
    }

    // Marcar la compra como Finalizada
    await Compra_Proveedor.update(
      { estado_comp: 'F', fin_de_registro_lotes: new Date() },
      { where: { id_comp: id_compra_proveedor } }
    );
  },
};
