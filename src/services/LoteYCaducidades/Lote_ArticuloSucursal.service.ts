import {
  ILotesArticuloSucursal,
  ICreaterOrUdateLotesArticuloSucursal,
} from "../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface";
import { LotesArticuloSucursalRepository } from "../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository";

export const LotesArticuloSucursalService = {
  getAll: async (): Promise<ILotesArticuloSucursal[]> => {
    return await LotesArticuloSucursalRepository.getAll();
  },
  getById: async (id: string): Promise<ILotesArticuloSucursal> => {
    const loteartic = await LotesArticuloSucursalRepository.getById(id);
    if (!loteartic) throw new Error("Lote Articulo Sucursal no enocontrado");
    return loteartic;
  },
  getLotesPorCodigoBarra: async (cod_barr_artic: string) => {
    return await LotesArticuloSucursalRepository.getLotesPorCodigoBarra(
      cod_barr_artic
    );
  },
  repartirCantidadEntreLotes: async (cod_barr_artic: string, cantidadSolicitada: number) => {
    return await LotesArticuloSucursalRepository.repartirCantidadEntreLotes(cod_barr_artic, cantidadSolicitada);
  },
  create: async (data: ICreaterOrUdateLotesArticuloSucursal) => {
    return LotesArticuloSucursalRepository.create(data);
  },
  /*
  update: async (data: ICreaterOrUdateLotesArticuloSucursal) => {
    return await LotesArticuloSucursalRepository.updateOrUpdate(data);
  },
  */
  // update: async (id_lote_sucursal: string, data: ICreaterOrUdateLotesArticuloSucursal) => {
  //     const result = await LotesArticuloSucursalRepository.update(id_lote_sucursal, data);

  //     if (!result) {
  //         throw new Error("No se actualizó ningún registro");
  //     }

  //     // Ahora sí, busca el lote actualizado
  //     return await LotesArticuloSucursalRepository.getById(id_lote_sucursal);
  //}
};
