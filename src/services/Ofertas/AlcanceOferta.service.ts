import { dbLocal } from "../../config/db";
import { ICreateOrUpdateAlcanceOferta } from "../../interface/Ofertas/AlcanceOferta.interface";
import { AlcanceOfertaRepository } from "../../repository/Ofertas/OfertaAlcance.repository";
import { v4 as uuidv4 } from "uuid";

export const AlcanceOfertaService = {
  getAll: async () => {
    return await AlcanceOfertaRepository.getAll();
  },

  getById: async (id_oferta: string) => {
    const oferta = await AlcanceOfertaRepository.getById(id_oferta);
    if (!oferta) throw new Error("Oferta no enocontrada1");
    return oferta;
  },

  create: async (data: ICreateOrUpdateAlcanceOferta) => {
    return await AlcanceOfertaRepository.create(data);
  },

  update: async (id: string, data: Partial<ICreateOrUpdateAlcanceOferta>) => {
    const alcanceOferta = await AlcanceOfertaRepository.getById(id);
    if (!alcanceOferta) return null;
    await alcanceOferta.update(data);
    return alcanceOferta;
  },
};
