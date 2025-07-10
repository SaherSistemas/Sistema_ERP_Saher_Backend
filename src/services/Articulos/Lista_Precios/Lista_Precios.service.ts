import { ICreateOrUpdateListaDePrecio } from "../../../interface/Articulos/Lista_Precios/Lista_Precios.interface";
import { ListaPreciosRepository } from "../../../repository/Articulos/Lista_Precio/Lista_Perecio.repository";

export class ListaPreciosService {
  static getAll = async () => {
    return await ListaPreciosRepository.getAll();
  };

  static getById = async (id: string) => {
    return await ListaPreciosRepository.getById(id);
  };

  static create = async (data: any) => {
    return await ListaPreciosRepository.create(data);
  };

  static update = async (id: string, data: ICreateOrUpdateListaDePrecio) => {
    return await ListaPreciosRepository.update(id, data);
  };

  // static delete = async (id: string) => {
  //   return await ListaPreciosRepository.delete(id);
  // };
}
