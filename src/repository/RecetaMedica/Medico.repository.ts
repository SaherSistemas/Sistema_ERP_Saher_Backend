import { v4 as uuidv4 } from "uuid";
import Medico from "../../models/RecetaMedica/Medico";
import { ICreateOrUpdateMedico } from "../../interface/RecetaMedica/Medico.interface";
import { isUUID } from "../../utils/validaciones";
import { Op, literal } from "sequelize";
import { Transaction } from "sequelize";

export const MedicoRepository = {
  getAll: async () => {
    return await Medico.findAll();
  },

  create: async (data: ICreateOrUpdateMedico) => {
    return await Medico.create({
      id_medico: uuidv4(),
      ...data,
    });
  },

  getByIDFlexible: async (identificador_medico: string) => {
    if (isUUID(identificador_medico)) {
      return await Medico.findByPk(identificador_medico);
    } else {
      return await Medico.findAll({
        where: {
          [Op.or]: [
            { telefono: identificador_medico },
            { nombre_completo: { [Op.iLike]: `%${identificador_medico}%` } },
            { especialidad: { [Op.iLike]: `%${identificador_medico}%` } },
            { cedula_profesional: { [Op.iLike]: `%${identificador_medico}%` } },
          ],
        },
      });
    }
  },
  BuscarMedicoCedula: async (cedula_medico: string) => {
    return await Medico.findOne({
      where: { cedula_profesional: { [Op.eq]: cedula_medico } },
      attributes: [
        'id_medico',
        'nombre_completo',
        'especialidad',
        'telefono',
        'correo',
        'direccion'
      ],
    });
  },

  resolveOrCreate: async (
    t: Transaction,
    args: {
      id_medico?: string | null;
      medico_nuevo?: {
        nombre_completo: string;
        cedula_profesional: string;
        especialidad?: string | null;
        telefono?: string | null;
        correo?: string | null;
        direccion?: string | null;
      };
    }
  ): Promise<string> => {
    const id = args.id_medico?.trim();
    if (id) return id;

    const m = args.medico_nuevo;
    if (!m) throw new Error("Médico no resuelto.");

    const ced = m.cedula_profesional?.trim();
    if (!ced) throw new Error("Médico no resuelto: falta cédula_profesional.");

    const existing = await Medico.findOne({
      where: { cedula_profesional: ced },
      transaction: t,
    });
    if (existing) return existing.id_medico;

    if (!m.nombre_completo?.trim()) {
      throw new Error(
        "Médico no resuelto: falta nombre_completo para crearlo."
      );
    }

    const med = await Medico.create(
      {
        id_medico: uuidv4(),
        nombre_completo: m.nombre_completo.trim(),
        cedula_profesional: ced,
        especialidad: m.especialidad ?? null,
        telefono: m.telefono ?? null,
        correo: m.correo ?? null,
        direccion: m.direccion ?? null,
      },
      { transaction: t }
    );
    return med.id_medico;
  },


};
