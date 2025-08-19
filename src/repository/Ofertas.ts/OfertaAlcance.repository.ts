import { ICreateOrUpdateAlcanceOferta } from "../../interface/Ofertas/AlcanceOferta.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";

export const AlcanceOfertaRepository = {
  getAll: async () => {
    return await AlcanceOfertas.findAll();
  },

  getById: async (id_alcance: string) => {
    if (isUUID(id_alcance)) {
      return await AlcanceOfertas.findByPk(id_alcance);
    }
  },

  create: async (data: ICreateOrUpdateAlcanceOferta) => {
    return await AlcanceOfertas.create({
      id_alcance: uuidv4(),
      ...data,
    });
  },

  update: async (id: string, data: Partial<ICreateOrUpdateAlcanceOferta>) => {
    if (!isUUID(id)) return null;
    const alcanceOferta = await AlcanceOfertas.findByPk(id);

    if (!alcanceOferta) return null;
    await alcanceOferta.update(data);
    return alcanceOferta;
  },
};
