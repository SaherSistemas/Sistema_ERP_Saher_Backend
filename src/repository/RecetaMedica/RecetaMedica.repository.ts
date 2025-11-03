import { v4 as uuidv4 } from "uuid";
import RecetaMedica from "../../models/RecetaMedica/RecetaMedica";
import {
  ICreateOrUpdateRecetaMedica,
  IRecetaMedica,
  IRecetaDesdeVenta,
} from "../../interface/RecetaMedica/RecetaMedica.interface";
import Empleado from "../../models/Usuarios/Empleado/Empleado";
import { Transaction } from "sequelize";
import Medico from "../../models/RecetaMedica/Medico";


export const RecetaMedicaRepository = {
  getAll: async () => {
    return await RecetaMedica.findAll({
      include: [
        {
          model: Empleado,
          as: "creadoPor",
          attributes: ["id_empleado", "nombre_empleado"],
        },
        {
          model: Medico,
          as: "medico",
          attributes: ["id_medico", "nombre_completo", "cedula_profesional", "especialidad", "telefono", "correo", "direccion"],
        },
      ], order: [['createdAt', 'DESC']],
    });
  },

  create: async (
    t: Transaction,
    args: {
      id_venta?: string | null;
      id_medico: string;
      data: {
        paciente_nombre: string;
        paciente_direccion?: string | null;
        fecha_expedicion: string;
        folio?: string | null;
        fuente?: "FISICA" | "DIGITAL" | null;
        creada_por_usuario: string;
      };
    }
  ) => {
    const receta = await RecetaMedica.create(
      {
        id_receta: uuidv4(),
        id_medico: args.id_medico,
        paciente_nombre: args.data.paciente_nombre,
        paciente_direccion: args.data.paciente_direccion ?? null,
        fecha_expedicion: args.data.fecha_expedicion,
        folio: args.data.folio ?? null,
        fuente: args.data.fuente ?? null,
        creada_por_usuario: args.data.creada_por_usuario,
        id_venta: args.id_venta ?? null,
      },
      { transaction: t }
    );
    return receta;
  },
};
