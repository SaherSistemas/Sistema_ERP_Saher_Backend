import { ICreateOrUpdateUsoOferta, IUsoOferta } from "../../interface/Ofertas/UsoOferta.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import UsoOferta from "../../models/Ofertas/UsoOferta"; 


export const UsoOfertaRepository = {
  getAll: async () => {
    return await UsoOferta.findAll()
  },

  getById: async (id_uso: string) => {
    if (isUUID(id_uso)) {
      return await UsoOferta.findByPk();
    }
  },

  create: async (data: ICreateOrUpdateUsoOferta) => {
    return await UsoOferta.create({
      id_uso: uuidv4(),
      ...data,
    });
  },

  update: async (id: string, data: Partial<ICreateOrUpdateUsoOferta>) => {
    if (!isUUID(id)) return null;
    const usoOferta = await UsoOferta.findByPk(id);

    if (!usoOferta) return null;
    await usoOferta.update(data);
    return usoOferta;
  },
};
