import {
  ICreateOrUpdateIDetalleListaPrecio,
  IDetalleListaDePrecio
} from '../interface/Detalle_Lista_Pecios.interface';
import DetalleListaPrecio from '../model/Detalle_Lista_Precio';
import { v4 as uuidv4 } from 'uuid';
import ListaPrecio from '../model/Lista_Precio';
import { Transaction } from 'sequelize'; // Asegúrate de importar Transaction

export const DetalleListaPreciosRepository = {
  getAll: async () => {
    return await DetalleListaPrecio.findAll({
      include: [
        {
          model: ListaPrecio,
          attributes: ['nombre_lista_precio']
        }
      ]
    });
  },

  getById: async (id: string) => {
    return await DetalleListaPrecio.findByPk(id);
  },

  getByArticulo: async (id_artic: string, id_lista_precio: string) => {
    return await DetalleListaPrecio.findOne({
      where: {
        id_lista_precio,
        id_artic
      }
    });
  },

  create: async (data: ICreateOrUpdateIDetalleListaPrecio) => {
    const nuevoUUID = uuidv4();

    return await DetalleListaPrecio.create({
      id_detalle_lista_precio: nuevoUUID,
      ...data
    });
  },

  updateOrCreate: async (data: ICreateOrUpdateIDetalleListaPrecio, options?: { transaction?: Transaction }) => {
    const [registro, created] = await DetalleListaPrecio.findOrCreate({
      where: {
        id_lista_precio: data.id_lista_precio,
        id_artic: data.id_artic
      },
      defaults: {
        id_detalle_lista_precio: uuidv4(),
        precios: data.precios
      },
      transaction: options?.transaction
    });

    if (!created) {
      registro.precios = data.precios;
      await registro.save();
    }

    return registro;
  }
};
