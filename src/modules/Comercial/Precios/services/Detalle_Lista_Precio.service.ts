import { ICreateOrUpdateIDetalleListaPrecio } from "../interface/Detalle_Lista_Pecios.interface";
import { DetalleListaPreciosRepository } from "../repositories/Detalle_Lista_Precio.repository";

export class DetalleListaPrecioService {
  static getAll = async () => {
    return await DetalleListaPreciosRepository.getAll();
  };

  static getById = async (id: string) => {
    return await DetalleListaPreciosRepository.getById(id);
  };

  static create = async (data: ICreateOrUpdateIDetalleListaPrecio) => {
    return await DetalleListaPreciosRepository.create(data);
  };

  static update = async (data: ICreateOrUpdateIDetalleListaPrecio) => {
    return await DetalleListaPreciosRepository.updateOrCreate(data);
  };


}
