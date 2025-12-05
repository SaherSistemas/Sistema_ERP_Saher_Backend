import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { ICreateDetallePedidoAlmacen } from '../../interface/Pedidos_Almacen/Detalle_Pedido_Almacen.interface';
import Detalle_Pedido_Almacen from '../../models/PedidosAlmacen/Detalle_Pedido_Almacen';
import Articulo from '../../models/Articulos/Articulo';

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

  findByIDPedido: async (id_pedido_almacen: string) => {
    return await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      include: [{ model: Articulo }],
    
    });
  }
};
