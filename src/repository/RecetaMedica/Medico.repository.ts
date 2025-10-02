import { v4 as uuidv4 } from "uuid";
import Medico from "../../models/RecetaMedica/Medico";
import { ICreateOrUpdateMedico } from "../../interface/RecetaMedica/Medico.interface";
import { isUUID } from "../../utils/validaciones";
import { Op, literal } from "sequelize";
import { Transaction } from "sequelize";

export const MedicoRepository = {
        getAll:async () => {
            return await  Medico.findAll();
        },

        create: async(data:ICreateOrUpdateMedico) =>{
        return await Medico.create({
            id_medico: uuidv4(),
            ...data
          });
        },
   
        getByIDFlexible: async(identificador_medico : string ) => {
        if(isUUID(identificador_medico)){
        return await Medico.findByPk( identificador_medico )
        }else{

        return await Medico.findAll({
            where:{
                [Op.or] : [
                { telefono: identificador_medico },
                { nombre_completo: { [Op.iLike]: `%${identificador_medico}%` } },
                { especialidad: { [Op.iLike]: `%${identificador_medico}%` } },
                { cedula_profesional: { [Op.iLike]: `%${identificador_medico}%` } }
                ]
            }
        });
    }
        },


        // resolveOrCreate: async (
        //     t: Transaction,
        //     args: {
        //     id_medico?: string | null;
        //     medico_nuevo?: {
        //         nombre_completo: string;
        //         cedula_profesional: string;
        //         especialidad?: string | null;
        //         telefono?: string | null;
        //         correo?: string | null;
        //         direccion?: string | null;
        //     };
        //     }
        // ): Promise<string> => {
        //     const { id_medico, medico_nuevo } = args;

        //     if (id_medico) return id_medico;

        //     if (medico_nuevo) {
        //     const med = await Medico.create(
        //         {
        //         id_medico: uuidv4(),
        //         nombre_completo: medico_nuevo.nombre_completo,
        //         cedula_profesional: medico_nuevo.cedula_profesional,
        //         especialidad: medico_nuevo.especialidad ?? null,
        //         telefono: medico_nuevo.telefono ?? null,
        //         correo: medico_nuevo.correo ?? null,
        //         direccion: medico_nuevo.direccion ?? null,
        //         },
        //         { transaction: t }
        //     );
        //     return med.id_medico;
        //     }

        //     throw new Error("Médico no resuelto.");
        // },
    
// Medico.repository.ts
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

  // 1) buscar por cédula (evita duplicados)
  const existing = await Medico.findOne({ where: { cedula_profesional: ced }, transaction: t });
  if (existing) return existing.id_medico;

  if (!m.nombre_completo?.trim()) {
    throw new Error("Médico no resuelto: falta nombre_completo para crearlo.");
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

//   throw new Error("Médico no resuelto.");
//   },
};