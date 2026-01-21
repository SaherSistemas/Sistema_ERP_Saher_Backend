import { ICatCreateMetodoPago } from '../interface/Cat_Metodo_Pago.interface';
import { Cat_Metodo_PagoRepository } from '../repositories/Cat_Metodo_Pago.repository';

export const Cat_Metodo_PagoService = {
  getAll: async () => {
    return await Cat_Metodo_PagoRepository.getAll();
  },

  getByID: async (id_metodo_pago: string) => {
    return await Cat_Metodo_PagoRepository.getByID(id_metodo_pago);
  },

  createMetodoPago: async (data: ICatCreateMetodoPago) => {
    return await Cat_Metodo_PagoRepository.create(data);
  }
};
