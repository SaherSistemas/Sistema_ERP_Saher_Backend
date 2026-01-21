import { ICatUsoCFDICreate, ICatUsoCFDIUpdate } from '../interface/Cat_Uso_CFDI.interface';
import { CatUsoCFDIRepository } from '../repositories/Cat_Uso_CFDI.respository';

export const CatUsoCFDIService = {
  getAll: async () => {
    return await CatUsoCFDIRepository.findAll();
  },

  getById: async (id: string) => {
    const result = await CatUsoCFDIRepository.findById(id);
    if (!result) throw { status: 404, message: 'Uso CFDI no encontrado' };
    return result;
  },

  create: async (data: ICatUsoCFDICreate) => {
    return await CatUsoCFDIRepository.create(data);
  },

  update: async (id: string, data: ICatUsoCFDIUpdate) => {
    await CatUsoCFDIService.getById(id);
    return await CatUsoCFDIRepository.update(id, data);
  },

  delete: async (id: string) => {
    await CatUsoCFDIService.getById(id);
    return await CatUsoCFDIRepository.delete(id);
  }
};
