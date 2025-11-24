import { ICatFormaPagoCreate, ICatFormaPagoUpdate } from '../../interface/Catalogos/Cat_Forma_De_Pago.interface';
import Cat_Forma_De_Pago from '../../models/Catalogos/Cat_Forma_De_Pago';

export const CatFormaPagoRepository = {
  findAll: async () => {
    return await Cat_Forma_De_Pago.findAll();
  },

  findById: async (id: string) => {
    return await Cat_Forma_De_Pago.findByPk(id);
  },

  create: async (data: ICatFormaPagoCreate) => {
    return await Cat_Forma_De_Pago.create({ ...data });
  },

  update: async (id: string, data: ICatFormaPagoUpdate) => {
    return await Cat_Forma_De_Pago.update(data, { where: { id_forma_de_pago: id } });
  },

  delete: async (id: string) => {
    return await Cat_Forma_De_Pago.destroy({ where: { id_forma_de_pago: id } });
  }
};
