import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import ReglaOferta from "../../models/Ofertas/ReglaOferta";
import { ICreateOrUpdateReglasOferta } from "../../interface/Ofertas/ReglasOferta.interface";
import { BulkCreateOptions, CreateOptions } from "sequelize";

export const ReglaOfertaRepository = {
  getAll: async () => {
    return await ReglaOferta.findAll();
  },

  getById: async (id_regla: string) => {
    if (isUUID(id_regla)) {
      return await ReglaOferta.findByPk(id_regla);
    }
  },

  create: async (data: ICreateOrUpdateReglasOferta,options?: CreateOptions ) => {
    return await ReglaOferta.create({
      id_regla: uuidv4(),
      ...data,
    },
   options );
  },
bulkCreate: async (
    rows: ICreateOrUpdateReglasOferta[],
    options?: BulkCreateOptions
  ) => {
    return await ReglaOferta.bulkCreate(
      rows.map(r => ({ id_regla: uuidv4(), ...r })), 
      options
    );
  },

  update: async (id_regla: string, data: Partial<ICreateOrUpdateReglasOferta>) => {
    if (!isUUID(id_regla)) return null;
    const regla = await ReglaOferta.findByPk(id_regla);
    if (!regla) return null;
    await regla.update(data);
    return regla;
  },
};
