import { ICreateOrUpdateIDetalleListaPrecio, IDetalleListaDePrecio } from "../../../interface/Articulos/Lista_Precios/Detalle_Lista_Pecios.interface";
import DetalleListaPrecio from "../../../models/Costo_Y_Precio/Lista_Precios/Detalle_Lista_Precio";
import { v4 as uuidv4 } from "uuid";
import ListaPrecio from "../../../models/Costo_Y_Precio/Lista_Precios/Lista_Precio";

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


  create: async (data: ICreateOrUpdateIDetalleListaPrecio) => {
    const nuevoUUID = uuidv4();


    return await DetalleListaPrecio.create({
      id_detalle_lista_precio: nuevoUUID,
      ...data,
    });
  },

  updateOrCreate: async (data: ICreateOrUpdateIDetalleListaPrecio) => {
    const [registro, created] = await DetalleListaPrecio.findOrCreate({
      where: {
        id_lista_precio: data.id_lista_precio,
        id_artic: data.id_artic
      },
      defaults: {
        id_detalle_lista_precio: uuidv4(),
        precios: data.precios
      }
    });

    if (!created) {
      registro.precios = data.precios;
      await registro.save();
    }

    return registro;
  },


};
