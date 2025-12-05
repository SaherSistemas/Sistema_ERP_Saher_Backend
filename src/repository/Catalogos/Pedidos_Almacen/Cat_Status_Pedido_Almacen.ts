import { ICreateOrUpdateCatTipoPedidoAlmacen } from '../../../interface/Catalogos/Pedidos_Almacen/Cat_Tipo_Pedido_Almacen.interface';
import Cat_Tipo_Pedido_Almacen from '../../../models/Catalogos/Pedidos_Almacen/Cat_Tipo_Pedido_Almacen';

export const CatTipoPedidoAlmacenRepository = {
  findAll: async () => {
    return await Cat_Tipo_Pedido_Almacen.findAll({
      order: [['id_tipo_pedido_almacen', 'ASC']]
    });
  },

  findById: async (id: string) => {
    return await Cat_Tipo_Pedido_Almacen.findByPk(id);
  },

  create: async (data: ICreateOrUpdateCatTipoPedidoAlmacen) => {
    return await Cat_Tipo_Pedido_Almacen.create({
      ...data,
      activo: data.activo ?? true
    });
  },

  update: async (id: string, data: Partial<ICreateOrUpdateCatTipoPedidoAlmacen>) => {
    return await Cat_Tipo_Pedido_Almacen.update(data, {
      where: { id_tipo_pedido_almacen: id }
    });
  },

};
