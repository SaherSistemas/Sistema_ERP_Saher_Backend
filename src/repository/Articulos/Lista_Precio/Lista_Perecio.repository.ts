import { ICreateOrUpdateListaDePrecio, IListaDePrecio } from "../../../interface/Articulos/Lista_Precios/Lista_Precios.interface";
import ListaPrecios from "../../../models/Articulos/Lista_Precios/Lista_Precio";
import { v4 as uuidv4 } from "uuid";

export const ListaPreciosRepository = {
  getAll: async () => {
    return await ListaPrecios.findAll();
  },

  getById: async (id: string) => {
    return await ListaPrecios.findByPk(id);
  },

  create: async (data: ICreateOrUpdateListaDePrecio) => {
    return await ListaPrecios.create({
      id_lista_de_precio: uuidv4(),
      ...data,
    });
  },

  update: async (id: string, data: ICreateOrUpdateListaDePrecio) => {
     return await ListaPrecios.update(data, {
            where: { id }
        });
  },

//   delete: async (id: string) => {
//     const lista = await ListaPrecios.findByPk(id);
//     if (!lista) return null;
//     await lista.destroy();
//     return true;
// },
};
