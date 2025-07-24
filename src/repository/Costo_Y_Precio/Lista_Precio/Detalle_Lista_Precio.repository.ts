import { ICreateOrUpdateIDetalleListaPrecio, IDetalleListaDePrecio } from "../../../interface/Articulos/Lista_Precios/Detalle_Lista_Pecios.interface";
import DetalleListaPrecio from "../../../models/Costo_Y_Precio/Lista_Precios/Detalle_Lista_Precio";
import { v4 as uuidv4 } from "uuid";
import ListaPrecio from "../../../models/Costo_Y_Precio/Lista_Precios/Lista_Precio";

export const DetalleListaPreciosRepository = {
  
  getAll: async () => {
    return await DetalleListaPrecio.findAll({
      include : [
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

  update: async (id: string, data: ICreateOrUpdateIDetalleListaPrecio) => {
    return await DetalleListaPrecio.update(data, {
      where: { id }
    });
  },


};
