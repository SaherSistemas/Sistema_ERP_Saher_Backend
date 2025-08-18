import Ofertas from "../../models/Ofertas/Ofertas";
import {
  ICreateOrUpdateOferta,
  IOferta,
} from "../../interface/Ofertas/Ofertas.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";

const OfertaIncludes = [
  {
    model: AlcanceOfertas,
    as: "alcances",
  },
];

export const OfertaRepository = {
  getAll: async () => {
    return await Ofertas.findAll({
      include: OfertaIncludes,
    });
  },

  getById: async (id_oferta: string) => {
    if (isUUID(id_oferta)) {
      return await Ofertas.findByPk(id_oferta, {
        include: OfertaIncludes,
      });
    }
  },

  create: async (data: ICreateOrUpdateOferta) => {
    return await Ofertas.create({
      id_oferta: uuidv4(),
      status_oferta: true,
      ...data,
    });
  },

  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    if (!isUUID(id)) return null;
    const oferta = await Ofertas.findByPk(id);

    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
};
