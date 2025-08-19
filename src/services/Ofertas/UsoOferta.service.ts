import { dbLocal } from "../../config/db";
import { ICreateOrUpdateUsoOferta, IUsoOferta } from "../../interface/Ofertas/UsoOferta.interface";
import { UsoOfertaRepository } from "../../repository/Ofertas.ts/UsoOferta.repository";
import { v4 as uuidv4 } from "uuid";

export const UsoOfertaService = {
  getAll: async () => {
    return await UsoOfertaRepository.getAll();
  },
  getById: async (id_uso: string) => {
    const uso_oferta = await UsoOfertaRepository.getById(id_uso);
    if (!uso_oferta) throw new Error("Uso no enocontrado");
    return uso_oferta;
  },

  create: async (data: ICreateOrUpdateUsoOferta) => {
    return await UsoOfertaRepository.create(data);
  },

  update: async (id: string, data: Partial<ICreateOrUpdateUsoOferta>) => {
    const uso_oferta = await UsoOfertaRepository.getById(id);
    if (!uso_oferta) return null;
    await uso_oferta.update(data);
    return uso_oferta;
  },
};
