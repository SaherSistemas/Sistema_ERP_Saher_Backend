import { ICreateOrUpdateCatStatusPedidoAlmacen } from '../../../../interface/Catalogos/Pedidos_Almacen/Cat_Status_Pedido_Almacen.interface';
import Cat_Status_Pedido_Almacen from '../model/Cat_Status_Pedido_Almacen';

export const CatStatusPedidoAlmacenRepository = {
  findAll: async () => {
    return await Cat_Status_Pedido_Almacen.findAll({
      order: [['orden', 'ASC']]
    });
  },

  findById: async (id: string) => {
    return await Cat_Status_Pedido_Almacen.findByPk(id);
  },

  create: async (data: ICreateOrUpdateCatStatusPedidoAlmacen) => {
    return await Cat_Status_Pedido_Almacen.create({
      ...data,
      activo: data.activo ?? true
    });
  },

  update: async (id: string, data: Partial<ICreateOrUpdateCatStatusPedidoAlmacen>) => {
    return await Cat_Status_Pedido_Almacen.update(data, {
      where: { id_status_pedido_almacen: id }
    });
  },

};
