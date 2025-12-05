import { dbLocal } from "../../config/db";
import { v4 as uuidv4 } from "uuid";

import { ReglaOfertaRepository } from "../../repository/Ofertas/ReglaOferta.repository";
import { ICreateOrUpdateReglasOferta } from "../../interface/Ofertas/ReglasOferta.interface";

export const ReglaOfertaService = {

  getAll: async () => {
    return await ReglaOfertaRepository.getAll();
  },

  getById: async (id_oferta: string) => {
    const oferta = await ReglaOfertaRepository.getById(id_oferta);
    if (!oferta) throw new Error("Regla de Oferta no enocontrada");
    return oferta;
  },

  create: async (data: ICreateOrUpdateReglasOferta) => {
    if (!data.id_oferta)
      throw new Error("id_oferta es obligatorio.");

    if (!data.tipo_beneficio)
      throw new Error("tipo_beneficio es obligatorio.");

    return await ReglaOfertaRepository.create(data);
  },


  update: async (id: string, data: Partial<ICreateOrUpdateReglasOferta>) => {
    const alcanceOferta = await ReglaOfertaRepository.getById(id);
    if (!alcanceOferta) return null;
    await alcanceOferta.update(data);
    return alcanceOferta;
  },
};
