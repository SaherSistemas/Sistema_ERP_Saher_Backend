import Cliente_Almacen from "../../../models/Clientes/Cliente_Almacen/Cliente_Almacen";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import { isUUID } from "../../../utils/validaciones";
import { ICreateClienteAlmacen } from "../../../interface/Clientes/Cliente_Almacen/Cliente_Almacen.interface";
export const Cliente_AlmacenRepository = {
  getAll: async () => {
    return await Cliente_Almacen.findAll();
  },
  getAllByAgente: async (id_agente: string) => {
    return await Cliente_Almacen.findAll({
      where: { id_agente_cliente_alm: id_agente },
    });
  },

  getClienteByTermSerch: async (term_serch: string) => {
    return await Cliente_Almacen.findAll({
      where: {
        [Op.or]: [
          { razon_social_cliente_alm: { [Op.iLike]: `%${term_serch}%` } },
          { nom_corto_cliente_alm: { [Op.iLike]: `%${term_serch}%` } },
        ],
      },
      limit: 20,
      order: [["razon_social_cliente_alm", "ASC"]],
    });
  },

  getByIDFlexible: async (id_cliente_alm: string) => {
    if (isUUID(id_cliente_alm)) {
      return await Cliente_Almacen.findByPk(id_cliente_alm);
    } else {
      return await Cliente_Almacen.findOne({
        where: {
          id_interno_cliente_alm: id_cliente_alm,
        },
      });
    }
  },

  create: async (data: ICreateClienteAlmacen) => {
    const nuevoUUID = uuidv4();

    return await Cliente_Almacen.create({
      id_cliente_alm: nuevoUUID,
      ...data,
    });
  },
};
