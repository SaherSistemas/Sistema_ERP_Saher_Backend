import { dbLocal } from "../../config/db";
import {
  IOferta,
  ICreateOrUpdateOferta,
  canal,
} from "../../interface/Ofertas/Ofertas.interface";
import { OfertaRepository } from "../../repository/Ofertas/Ofertas.repository";
import { v4 as uuidv4 } from "uuid";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";
import ReglaOferta from "../../models/Ofertas/ReglaOferta";

export const OfertaService = {
  getOfertas: async (args: {
    id_empre: string;
    fecha?: string | Date;
    canal?: canal;
    id_cliente?: string;
  }) => {
    const { id_empre, canal } = args;
    if (!id_empre) throw new Error("Faltan parámetros");

    const fecha =
      typeof args.fecha === "string"
        ? new Date(args.fecha)
        : args.fecha instanceof Date
          ? args.fecha
          : new Date();

    const candidatasSucursal = await OfertaRepository.getOfertasSucursal({ id_empre, fecha });
    return candidatasSucursal;
  },

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

  createOferta: async (data: ICreateOrUpdateOferta) => {
    if (!data.alcances?.length) throw new Error("Debes enviar al menos un alcance.");
    if (!data.reglas?.length) throw new Error("Debes enviar al menos una regla.");

    return await OfertaRepository.create(data);
  },

  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    const oferta = await OfertaRepository.getById(id);
    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
};
