import { ICreateClienteAlmacen } from '../../../interface/Clientes/Cliente_Almacen/Cliente_Almacen.interface';
import { Cliente_AlmacenRepository } from '../../../repository/Clientes/Cliente_Almacen/Cliente_Almacen.repository';

export const Cliente_AlmacenService = {
  getAllPaginado: async (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    return await Cliente_AlmacenRepository.getAllPaginado(limit, offset);
  },
  getAllByAgente: async (id_agente: string) => {
    return await Cliente_AlmacenRepository.getAllByAgente(id_agente);
  },
  getClienteByTermSerch: async (term_serch: string) => {
    return await Cliente_AlmacenRepository.getClienteByTermSerch(term_serch);
  },
  getByIDFlexible: async (id_cliente_alm: string) => {
    return await Cliente_AlmacenRepository.getByIDFlexible(id_cliente_alm);
  },
  create: async (data: ICreateClienteAlmacen) => {
    return await Cliente_AlmacenRepository.create(data);
  }
};
