import { isUUID } from "../../utils/validaciones";
import Turno_Programado from "../../models/Calendario_Horario/Turno_Programado";
import Calendario_Horario from "../../models/Calendario_Horario/Periodo_Calendario";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Empleado from "../../models/Usuarios/Empleado";
import { ICreateOrUpdateTurno_Programado } from "../../interface/Calendario_horario/Turno_Programado.interface";
import { uuidv4 } from "zod";
import { Op } from "sequelize";

export const Turno_ProgramadoRepository = {

  getTurnosPorPeriodo : async (id_periodo: string) => {
    if (!isUUID(id_periodo)) {
         throw new Error("ID de periodo inválido");
    } 

    return await Turno_Programado.findAll({
      where: { 
        id_periodo, 
        estado:{[Op.ne]: 'Cerrado'} },
      include: ["empresa_sucursal", "rol", "asignacion"],
      order: [
        ['fecha', 'ASC'],
        ['hora_inicio', 'ASC']
      ]
    });
  },    

  getAll: async () => {
    return await Turno_Programado.findAll();
  },

  getById: async (id_turno: string) => {
    if (!isUUID(id_turno)) throw new Error("ID de turno inválido");
    return await Turno_Programado.findByPk(id_turno);
  },

  create: async (data: ICreateOrUpdateTurno_Programado) => {
    return await Turno_Programado.create({
      id_turno: uuidv4(),
      ...data,
    });
  },

  update: async (id_turno: string, data: ICreateOrUpdateTurno_Programado) => {
    if (!isUUID(id_turno)) throw new Error("ID de turno inválido");
    const turno = await Turno_Programado.findByPk(id_turno);
    if (!turno) throw new Error("Turno no encontrado");
    return await turno.update(data);
  },

  delete: async (id_turno: string) => {
    if (!isUUID(id_turno)) throw new Error("ID de turno inválido");
    const turno = await Turno_Programado.findByPk(id_turno);
    if (!turno) throw new Error("Turno no encontrado");
    await turno.destroy();
    return true;
  },
};
