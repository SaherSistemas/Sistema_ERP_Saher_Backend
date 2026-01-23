import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Articulo from '../../../Inventario/Articulos/model/Articulo';
import { ICreateDetallePedidoAlmacen, IUpdateDetallePedidoAlmacen } from '../interface/Detalle_Pedido_Almacen.interface';
import { ActualizarDetallesPedidoRequest, IUpdatePedidoAlmacen } from '../interface/Pedido_Almacen';


export const Detalle_Pedido_AlmacenRepository = {
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
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: {
        id_pedido_alm
      },
      transaction: t
    });

    if (!detalles) throw new Error('Detalles no encontrado');


    return detalles;
  },

  findByIDPedido: async (id_pedido_almacen: string) => {
    return await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      include: [{
        model: Articulo,
        attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva']
      }],
    });
  }


};
