import { ICreateOrUpdateListaPrecio, IListaDePrecio } from "../../../interface/Costo_y_Precio/Lista_Precios/Lista_Precios.interface";
import ListaPrecio from "../../../models/Costo_Y_Precio/Lista_Precios/Lista_Precio";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../../utils/validaciones";

export const ListaPrecioRepository = {
  getAll: async () => {
    return await ListaPrecio.findAll();
  },

  getById: async (id: string) => {
    if (isUUID(id)) {
      return await ListaPrecio.findByPk(id);
    }

    if (!isNaN(Number(id)) && Number.isInteger(Number(id))) {
      const foundByCodInt = await ListaPrecio.findOne({
        where: { cod_int_lista_precio: Number(id) }
      });
      if (foundByCodInt)
        return foundByCodInt;
    }
    return null;
  },


  ultimoId: async () => {
    return await ListaPrecio.findOne({
      order: [["cod_int_lista_precio", "DESC"]]
    })
  },

  create: async (data: ICreateOrUpdateListaPrecio) => {
    const nuevoUUID = uuidv4();
    const UltimoId = await ListaPrecioRepository.ultimoId();

    const nuevoID = UltimoId ? UltimoId.cod_int_lista_precio + 1 : 1;
    return await ListaPrecio.create({
      id_lista_de_precio: nuevoUUID,
      cod_int_lista_precio: nuevoID,
      ...data,
    });
  },

  update: async (id_lista_precio: string, data: ICreateOrUpdateListaPrecio) => {
    return await ListaPrecio.update(data, {
      where: { id_lista_precio }
    });
  },


};
