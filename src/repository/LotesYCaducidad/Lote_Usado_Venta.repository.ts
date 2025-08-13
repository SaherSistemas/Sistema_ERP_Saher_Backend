import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import {
  ILoteUsadoVenta,
  ICreateOrUpdateLoteUsadoVenta,
  ILoteUsadoVentaInput,
} from "../../interface/LotesYCaducidad/Lote_Usado_Venta.interaface";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from "uuid";
import { CreateOptions, Transaction } from "sequelize";

export const LoteUsadoVentaRepository = {
  getAll: async () => {
    return await LoteUsadoVenta.findAll();
  },

  getById: async (id: string) => {
    if (isUUID(id)) {
      return await LoteUsadoVenta.findByPk(id);
    }
  },

  create: async (data: ILoteUsadoVentaInput, options?: CreateOptions) => {
    return await LoteUsadoVenta.create(
      { 
        id_lote_usado: uuidv4(), 
        ...data },
        options
    );
  },

  // update : async (id_lote_usado : string, data : ICreateOrUpdateLoteUsadoVenta) => {
  //     const existe = await LoteUsadoVentaRepository.getById(id_lote_usado);
  //     if (!existe) return null;
  //     return await existe.update(data)
  // }
};
