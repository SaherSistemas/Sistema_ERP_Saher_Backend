import { MedicoRepository } from "../../repository/RecetaMedica/Medico.repository";
import { ICreateOrUpdateMedico } from "../../interface/RecetaMedica/Medico.interface";

export const MedicoService = {

  getAll: async () => {
    return await MedicoRepository.getAll();
  },
  create: async (data: ICreateOrUpdateMedico) => {
    return await MedicoRepository.create(data);
  },
  getByIDFlexible: async(id_medico  : string ) => {
    return await MedicoRepository.getByIDFlexible(id_medico );
  },
  BuscarMedicoCedula: async(cedula_medico : string ) => {
    return await MedicoRepository.BuscarMedicoCedula(cedula_medico);
  }

};
