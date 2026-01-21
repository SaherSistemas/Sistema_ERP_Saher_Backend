import { ICreateOrUpdateUnidadMedida } from '../interface/UnidadMedida.interface';
import { UnidadMedidaRepository } from '../repositories/UnidadMedida.repository';

export const UnidadMedidaService = {
  getAllUnidadMedida: async () => {
    return await UnidadMedidaRepository.getAll();
  },
  getAllUnidadMedidaPrueba: async () => {
    return await UnidadMedidaRepository.getAllPrueba();
  },

  getByID: async (id: number) => {
    return await UnidadMedidaRepository.getByID(id);
  },

  createUnidadMedida: async (data: ICreateOrUpdateUnidadMedida) => {
    return await UnidadMedidaRepository.createUnidaMedida(data);
  },
  updateByID: async (id_medida: number, data: ICreateOrUpdateUnidadMedida) => {
    return await UnidadMedidaRepository.updateMedida(id_medida, data);
  }
};
