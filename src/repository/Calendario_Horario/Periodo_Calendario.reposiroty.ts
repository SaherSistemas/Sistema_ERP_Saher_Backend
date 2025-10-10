import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import { Op, literal } from "sequelize";
import { Transaction } from "sequelize";
import Periodo_Calendario from "../../models/Calendario_Horario/Periodo_Calendario";
import { ICreateOrUpdatePeriodo_Calendario } from "../../interface/Calendario_horario/Periodo_Calendario.interface";
import Medico from "../../models/RecetaMedica/Medico";

export const Periodo_CalendarioRepository = {
  getAll: async () => {
    return await Periodo_Calendario.findAll();
  },

  getById : async (id_periodo: string) => {
    if (!isUUID(id_periodo)) throw new Error("ID de periodo inválido");
    return await Periodo_Calendario.findByPk(id_periodo);
  },

  getActivo: async () => {
    return await Periodo_Calendario.findOne({
      where: { estado: "activo" },
    });
  },

  activarPeriodo: async (id_periodo: string) => {
    const periodo = await Periodo_Calendario.findByPk(id_periodo);
    if (!periodo) throw new Error("Periodo no encontrado");
    if (periodo.estado === "activo") return periodo; // ya está activo

    periodo.estado = "activo";
    await periodo.save();
    return periodo;
  },

  cerrarPeriodo: async (id_periodo: string) => {
    const periodo = await Periodo_Calendario.findByPk(id_periodo);
    if (!periodo) throw new Error("Periodo no encontrado");
    if (periodo.estado === "cerrado") return periodo; // ya está cerrarPeriododo
    periodo.estado = "cerrado";
    periodo.fecha_cierre = new Date();
    await periodo.save();
    return periodo;
  },

  duplicarPeriodo: async (
    id_periodo: string,
    data: ICreateOrUpdatePeriodo_Calendario
  ) => {
    const periodo = await Periodo_Calendario.findByPk(id_periodo);
    if (!periodo) throw new Error("Periodo no encontrado");
    const nuevoPeriodo = await Periodo_Calendario.create(
      {
        id_periodo: uuidv4(),
        ...data,
      },
      
    );
    return nuevoPeriodo;
  },

  create: async (data: ICreateOrUpdatePeriodo_Calendario) => {
    return await Periodo_Calendario.create({
      id_periodo: uuidv4(),
      ...data,
    });
  },

  update: async (
    id_periodo: string,
    data: ICreateOrUpdatePeriodo_Calendario
  ) => {
    const periodo = await Periodo_Calendario.findByPk(id_periodo);
    if (!periodo) throw new Error("Periodo no encontrado");
    await periodo.update(data);
    return periodo;
  },

  delete: async (id_periodo: string) => {
    const periodo = await Periodo_Calendario.findByPk(id_periodo);
    if (!periodo) throw new Error("Periodo no encontrado");
    await periodo.destroy();
    return true;
  }
};
