import { ICreateOrUpdateIDetalleListaPrecio, IDetalleListaDePrecio } from "../../../interface/Articulos/Lista_Precios/Detalle_Lista_Pecios.interface";
import DetalleListaPrecio from "../../../models/Articulos/Lista_Precios/Detalle_Lista_Precio";
import { v4 as uuidv4 } from "uuid";

export const DetalleListaPreciosRepository = {
  getAll: async () => {
    return await DetalleListaPrecio.findAll();
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
