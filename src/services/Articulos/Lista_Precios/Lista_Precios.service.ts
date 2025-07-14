import { ICreateOrUpdateListaPrecio,IListaDePrecio} from "../../../interface/Articulos/Lista_Precios/Lista_Precios.interface";
import { ListaPrecioRepository } from "../../../repository/Articulos/Lista_Precio/Lista_Precio.repository";

export const ListaPrecioService = {
   getAll : async () => {
    return await ListaPrecioRepository.getAll();
  },

   getById : async (id: string) => {
    return await ListaPrecioRepository.getById(id);
  },

   create : async (data: ICreateOrUpdateListaPrecio) => {
    return await ListaPrecioRepository.create(data);
  },

   update : async (id_lista_precio: string, data: ICreateOrUpdateListaPrecio) => {
    return await ListaPrecioRepository.update(id_lista_precio, data);
  },

  // static delete = async (id: string) => {
  //   return await ListaPreciosRepository.delete(id);
  // };
}
