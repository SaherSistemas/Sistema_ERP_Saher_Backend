import { ICatUsoCFDICreate, ICatUsoCFDIUpdate } from '../interface/Cat_Uso_CFDI.interface';
import Cat_uso_CFDI from '../model/Cat_Uso_CFDI';

export const CatUsoCFDIRepository = {
  findAll: async () => {
    return await Cat_uso_CFDI.findAll();
  },

  findById: async (id: string) => {
    return await Cat_uso_CFDI.findByPk(id);
  },

  create: async (data: ICatUsoCFDICreate) => {
    return await Cat_uso_CFDI.create({ ...data });
  },

  update: async (id: string, data: ICatUsoCFDIUpdate) => {
    return await Cat_uso_CFDI.update(data, { where: { id_uso_cfdi: id } });
  },

  delete: async (id: string) => {
    return await Cat_uso_CFDI.destroy({ where: { id_uso_cfdi: id } });
  }
};
