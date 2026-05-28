import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import { ICreateDetallePedidoAlmacen, } from '../interface/Detalle_Pedido_Almacen.interface';
import { ActualizarDetallesPedidoRequest, IUpdatePedidoAlmacen } from '../interface/Pedido_Almacen';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Detalle_Pedido_Almacen_Chequeo from '../model/Detalle_Pedido_Almacen_Chequeo';


export const Detalle_Pedido_AlmacenRepository = {
  getIdsDetallesPorPedido: async (id_pedido_alm: string, t?: Transaction) => {
    return await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen: id_pedido_alm },
      attributes: ['id_detalle_pedido_almacen'],
      raw: true,
      transaction: t
    });
  },
  findByID: async (id_detalle_pedido_almacen: string) => {
    return await Detalle_Pedido_Almacen.findByPk(id_detalle_pedido_almacen, {
      include: [{
        model: Articulo,
        attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva']
      }]
    });
  },

  addOrAccumulate: async (data: ICreateDetallePedidoAlmacen, t?: Transaction): Promise<Detalle_Pedido_Almacen> => {
    // 1. Buscar si ya existe el articulo en ese mismo pedido

    //console.log(data);
    const existente = await Detalle_Pedido_Almacen.findOne({
      where: {
        id_pedido_almacen: data.id_pedido_almacen,
        id_articulo: data.id_articulo
      },
      transaction: t
    });

    // 2. Si ya existe → ACUMULAR
    if (existente) {
      existente.cant_pedida = existente.cant_pedida + data.cantidad;

      await existente.save({ transaction: t });
      return existente;
    }

    // 3. Si no existe → CREAR NUEVO
    const nuevo = await Detalle_Pedido_Almacen.create(
      {
        id_detalle_pedido_almacen: uuidv4(),
        id_pedido_almacen: data.id_pedido_almacen,
        id_articulo: data.id_articulo,
        cant_pedida: data.cantidad,
        cantidad_surtida: 0,
        cantidad_checada: 0,
        precio_venta: data.precio_unitario,
        es_oferta: data.es_oferta ?? false
      },
      { transaction: t }
    );

    return nuevo;
  },

  sincronizarCarrito: async (data: ActualizarDetallesPedidoRequest, t?: Transaction) => {
    const { id_pedido, carrito } = data;

    // 1. Obtener todos los detalles actuales del pedido
    const detallesActuales = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen: id_pedido },
      transaction: t
    });

    const idsArticulosNuevoCarrito = carrito.map(item => item.id_articulo);

    // 2. Eliminar los detalles que ya no están en el carrito
    const detallesAEliminar = detallesActuales.filter(d => !idsArticulosNuevoCarrito.includes(d.id_articulo));
    for (const detalle of detallesAEliminar) {
      await detalle.destroy({ transaction: t });
    }

    // 3. Actualizar o crear los detalles restantes
    for (const item of carrito) {
      const detalleExistente = detallesActuales.find(d => d.id_articulo === item.id_articulo);

      if (detalleExistente) {
        // Actualizar
        detalleExistente.cant_pedida = item.cant_pedido;
        detalleExistente.precio_venta = item.precio_venta;
        await detalleExistente.save({ transaction: t });
      } else {
        // Crear nuevo
        await Detalle_Pedido_Almacen.create({
          id_detalle_pedido_almacen: uuidv4(),
          id_pedido_almacen: id_pedido,
          id_articulo: item.id_articulo,
          cant_pedida: item.cant_pedido,
          cantidad_surtida: 0,
          cantidad_checada: 0,
          precio_venta: item.precio_venta,
          iva: item.iva,
          es_oferta: false
        }, { transaction: t });
      }
    }

    return true;
  },
  getDetallesPorPedido: async (id_pedido_alm: string, t?: Transaction) => {
    // console.log(id_pedido_alm)
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: {
        id_pedido_almacen: id_pedido_alm
      },
      transaction: t
    });
    //console.log("DETALLES EN REPO:", detalles);
    if (!detalles) throw new Error('Detalles no encontrado');


    return detalles;
  },
  getDetallesPorPedidoYLotesSurtidos: async (id_pedido_alm: string, t?: Transaction) => {
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: {
        id_pedido_almacen: id_pedido_alm
      },
      attributes: [
        'id_detalle_pedido_almacen',
        'cant_pedida',
      ],
      include: [
        {
          model: Articulo,
          as: 'articulo',
          attributes: ['cod_barr_artic', 'des_artic'],
          required: false
        },
        {
          model: Detalle_Pedido_Almacen_Lote,
          as: 'lotes',
          attributes: [
            'id_lote_sucursal',
            'cantidad'
          ],
          required: false,
          include: [
            {
              model: Lote_Articulo_Sucursal,
              as: 'lote_articulo_sucursal',
              attributes: [
                'numero_lote_sucursal',
                'fecha_venci_lote_sucursal'
              ],
              required: false
            }
          ]
        }
      ],
      raw: true,
      transaction: t
    });
    return detalles;
  },
  getDetallesPorPedidoIDS: async (id_pedido_almacen: string, t?: Transaction) => {
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      attributes: ['id_detalle_pedido_almacen'],
      raw: true,
      transaction: t
    });

    return detalles.map((d: { id_detalle_pedido_almacen: string }) => d.id_detalle_pedido_almacen);
  },

  getDetallesConArticuloPorPedido: async (id_pedido_almacen: string, t?: Transaction) => {
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      attributes: ['id_detalle_pedido_almacen', 'id_articulo', 'cant_pedida'],
      raw: true,
      transaction: t
    });
    return detalles as Array<{ id_detalle_pedido_almacen: string; id_articulo: string; cant_pedida: number }>;
  },

  findByIDPedido: async (id_pedido_almacen: string) => {
    return await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      include: [
        {
          model: Articulo,
          attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva']
        },
        {
          model: Detalle_Pedido_Almacen_Chequeo,
          attributes: [
            'id_detalle_chequeo',
            'id_empleado',
            'estado',
            'fecha_asignado',
            'inicio',
            'fin',
            'cant_chequeada',
            'nota',
            'cant_surtida_lote'
          ]
        }
      ],
    });
  }


};
