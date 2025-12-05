import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import ReglaOferta from "../../models/Ofertas/ReglaOferta";
import { ICreateOrUpdateReglasOferta } from "../../interface/Ofertas/ReglasOferta.interface";
import { BulkCreateOptions, CreateOptions } from "sequelize";
import Ofertas from "../../models/Ofertas/Ofertas";

export const ReglaOfertaRepository = {
  getAll: async () => {
    return await ReglaOferta.findAll({
      include: [
        {
          model: Ofertas,
          attributes: ["nombre_oferta"],
        },
      ],
    }
    );
  },

  getById: async (id_regla: string) => {
    if (isUUID(id_regla)) {
      return await ReglaOferta.findByPk(id_regla);
    }
  },

  create: async (data: ICreateOrUpdateReglasOferta, options?: CreateOptions) => {
    const norm = (v?: string | null) =>
      (!v || v.trim() === "" ? null : v);

    return await ReglaOferta.create({
      id_regla: uuidv4(),
      ...data,
      articulo_gratis: norm(data.articulo_gratis)
    }, options);

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
