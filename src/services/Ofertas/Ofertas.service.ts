import { dbLocal } from "../../config/db";
import {
  IOferta,
  ICreateOrUpdateOferta,
} from "../../interface/Ofertas/Ofertas.interface";
import { OfertaRepository } from "../../repository/Ofertas.ts/Ofertas.repository";
import { v4 as uuidv4 } from "uuid";

export const OfertaService = {
  getAll: async () => {
    return await OfertaRepository.getAll();
  },
  getById: async (id_oferta: string) => {
    const oferta = await OfertaRepository.getById(id_oferta);
    if (!oferta) throw new Error("Oferta no enocontrada");
    return oferta;
  },

  create: async (data: ICreateOrUpdateOferta) => {
    return await OfertaRepository.create(data);
  },

  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    const oferta = await OfertaRepository.getById(id);
    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
};
