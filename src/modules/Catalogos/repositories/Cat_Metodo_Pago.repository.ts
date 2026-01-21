import { ICatCreateMetodoPago } from '../interface/Cat_Metodo_Pago.interface';
import Cat_Metodo_Pago from '../model/Cat_Metodo_Pago';

export const Cat_Metodo_PagoRepository = {
  getAll: async () => {
    return await Cat_Metodo_Pago.findAll();
  },

  getByID: async (id_metodo_pago: string) => {
    return await Cat_Metodo_Pago.findByPk(id_metodo_pago);
  },

  create: async (data: ICatCreateMetodoPago) => {
    return await Cat_Metodo_Pago.create({
      ...data
    });
  }
};
