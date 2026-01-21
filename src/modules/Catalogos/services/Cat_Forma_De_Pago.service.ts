import { ICatFormaPagoCreate, ICatFormaPagoUpdate } from '../interface/Cat_Forma_De_Pago.interface';
import { CatFormaPagoRepository } from '../repositories/Cat_Forma_De_Pago.repository';

export const CatFormaPagoService = {
  getAll: async () => {
    return await CatFormaPagoRepository.findAll();
  },

  getById: async (id: string) => {
    const result = await CatFormaPagoRepository.findById(id);
    if (!result) throw { status: 404, message: 'Forma de pago no encontrada' };
    return result;
  },

  create: async (data: ICatFormaPagoCreate) => {
    return await CatFormaPagoRepository.create(data);
  },

  update: async (id: string, data: ICatFormaPagoUpdate) => {
    await CatFormaPagoService.getById(id);
    return await CatFormaPagoRepository.update(id, data);
  },

  delete: async (id: string) => {
    await CatFormaPagoService.getById(id);
    return await CatFormaPagoRepository.delete(id);
  }
};
