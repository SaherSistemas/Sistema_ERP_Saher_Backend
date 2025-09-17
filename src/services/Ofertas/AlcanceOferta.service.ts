import { dbLocal } from "../../config/db";
import { ICreateOrUpdateAlcanceOferta } from "../../interface/Ofertas/AlcanceOferta.interface";
import { AlcanceOfertaRepository } from "../../repository/Ofertas/OfertaAlcance.repository";
import { v4 as uuidv4 } from "uuid";

export const AlcanceOfertaService = {
  getAll: async () => {
    return await AlcanceOfertaRepository.getAll();
  },

  getById: async (id_alcance: string) => {
    const alcance = await AlcanceOfertaRepository.getById(id_alcance);
    if (!alcance) throw new Error("Alcance de oferta no encontrado");
    return alcance;
  },

  create: async (data: ICreateOrUpdateAlcanceOferta) => {
    return await AlcanceOfertaRepository.create(data);
  },

  update: async (id: string, data: Partial<ICreateOrUpdateAlcanceOferta>) => {
    return await AlcanceOfertaRepository.update(id, data);  
  },
};
