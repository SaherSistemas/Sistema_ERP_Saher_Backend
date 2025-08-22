import { ICreateOrUpdateUsoOferta, IUsoOferta } from "../../interface/Ofertas/UsoOferta.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import UsoOferta from "../../models/Ofertas/UsoOferta"; 
import { CreateOptions } from "sequelize";


export const UsoOfertaRepository = {
  getAll: async () => {
    return await UsoOferta.findAll()
  },

  getById: async (id_uso: string) => {
    if (isUUID(id_uso)) {
      return await UsoOferta.findByPk();
    }
  },

  create: async (data: ICreateOrUpdateUsoOferta, options?: CreateOptions) => {
    return await UsoOferta.create(
      {
      id_uso: uuidv4(),
      fecha_uso: data.fecha_uso ?? new Date(), 
      ...data},
       options
    );
  },

  update: async (id: string, data: Partial<ICreateOrUpdateUsoOferta>) => {
    if (!isUUID(id)) return null;
    const usoOferta = await UsoOferta.findByPk(id);

    if (!usoOferta) return null;
    await usoOferta.update(data);
    return usoOferta;
  },
};
