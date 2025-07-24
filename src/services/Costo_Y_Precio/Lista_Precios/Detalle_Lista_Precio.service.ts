import { ICreateOrUpdateIDetalleListaPrecio } from "../../../interface/Articulos/Lista_Precios/Detalle_Lista_Pecios.interface";
import { DetalleListaPreciosRepository } from "../../../repository/Costo_Y_Precio/Lista_Precio/Detalle_Lista_Precio.repository";

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

  static update = async (id: string, data: ICreateOrUpdateIDetalleListaPrecio) => {
    return await DetalleListaPreciosRepository.update(id, data);
  };


}
