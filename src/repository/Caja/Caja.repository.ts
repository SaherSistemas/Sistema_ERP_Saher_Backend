import { UUID } from "crypto";
import Caja from "../../models/Caja/Caja";
import { isUUID } from "../../utils/validaciones";
import { ICaja } from "../../interface/Caja/Caja.interface";
import { v4 as uuidv4 } from "uuid";
import { get } from "http";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Corte_Caja from "../../models/Caja/Corte_Caja";

export const CajaRepository = {
  getAll: async () => {
    return await Caja.findAll({
      include: [
        {
          model: Corte_Caja,
          attributes: ["status_corte"],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["nom_empre"],
        },
      ],
    });
  },

  getAllCajasSucursal: async (id_empre: string) => {
    return await Caja.findAll({
      where: {
        id_empre: id_empre,
        activa: true,
      },
      include: [
        {
          model: Corte_Caja,
          attributes: ["status_corte"],
          where: {
            status_corte: false,
          },
          required: false,
        },
      ],
    });
  },

  activarCaja: async (id_caja: string) => {
    return await Caja.update(
      { activa: true },
      {
        where: { id_caja },
      }
    );
  },

  desactivarCaja: async (id_caja: string) => {
    return await Caja.update(
      { activa: false },
      {
        where: { id_caja },
      }
    );
  },

  getByIDFlexible: async (id_caja: string) => {
    if (isUUID(id_caja)) {
      return await Caja.findByPk(id_caja);
    } else {
      return await Caja.findOne({
        where: {
          nombre_caja: id_caja,
        },
      });
    }
  },

  getCantidadCajasPorSucursal: async (id_empre: string) => {
    return await Caja.count({
      where: { id_empre },
    });
  },

  createCaja: async (data: ICaja) => {
    return await Caja.create({
      id_caja: uuidv4(),
      ...data,
    });
  },

  updateCaja: async (id_caja: string, data: ICaja) => {
    return await Caja.update(data, {
      where: { id_caja },
    });
  },
};
