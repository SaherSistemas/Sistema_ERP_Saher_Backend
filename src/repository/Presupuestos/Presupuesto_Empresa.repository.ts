import { v4 as uuidv4 } from "uuid";
import {
  ICreateOrUpdatePresupuesto_Empresa,
  IPresupuesto_Empresa,
} from "../../interface/Presupuestos/Presupuesto_Empresa.interface";
import Presupuesto_Empresa from "../../models/Presupuestos/Presupuesto_Empresa";
import { isUUID } from "../../utils/validaciones";
import { Op, WhereOptions } from "sequelize";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";

interface PresupuestoFechaFiltro {
  anio?: number;
  mes?: number;
}

export const Presupuesto_EmpresaRepository = {
  getAll: async () => {
  return await Presupuesto_Empresa.findAll(
    {
    include: [
      {
        model: Empresa_Sucursal,
        attributes: ["nom_empre"], 
      },
    ]
  }
  );
},

  create: async (data: ICreateOrUpdatePresupuesto_Empresa) => {
    return await Presupuesto_Empresa.create({
      id_presupuesto: uuidv4(),
      ...data,
    });
  },
  update: async (
    id_presupuesto: string,
    data: ICreateOrUpdatePresupuesto_Empresa
  ) => {
    if (!isUUID(id_presupuesto)) return null;
    const presupuesto = await Presupuesto_Empresa.findByPk(id_presupuesto);

    if (!presupuesto) return null;
    await presupuesto.update(data);
    return presupuesto;
  },

  getByID: async (id_presupuesto: string) => {
  if (!isUUID(id_presupuesto)) {
    throw new Error("ID de presupuesto inválido.");
  }

  return await Presupuesto_Empresa.findByPk(id_presupuesto, {
    include: [
      {
        model: Empresa_Sucursal,
        attributes: ["id_empre", "nom_empre"],
      },
    ],
  });
},

  getByIDFlexible: async (id_presupuesto: string) => {
    if (isUUID(id_presupuesto)) {
      return await Presupuesto_Empresa.findByPk(id_presupuesto);
    } else {
      return await Presupuesto_Empresa.findAll({
        where: {
          [Op.or]: [
            { anio: { [Op.eq]: Number(id_presupuesto) } },
            { mes: { [Op.eq]: Number(id_presupuesto) } },
            { estado_presupuesto: { [Op.iLike]: `%${id_presupuesto}%` } },
          ],
        },
      });
    }
  },
  getAllEmpresa: async (id_empre: string) => {
    return await Presupuesto_Empresa.findAll({
      where: { id_empre },
    });
  },
  findByFecha: async (filtros: PresupuestoFechaFiltro) => {
    return await Presupuesto_Empresa.findAll({
      where: filtros as WhereOptions<typeof Presupuesto_Empresa>,
    });
  },
  getAllPresupuestoVigenteEmpresa: async (id_empre: string) => {
    return await Presupuesto_Empresa.findOne({
      where: {
        id_empre,
        estado_presupuesto: { [Op.ne]: "CERRADO" },
      },
    });
  }

  
};
