import { ICreateClienteAlmacen } from '../../../interface/Clientes/Cliente_Almacen/Cliente_Almacen.interface';
import { Cliente_AlmacenRepository } from '../../../repository/Clientes/Cliente_Almacen/Cliente_Almacen.repository';
import { AgenteRepository } from '../../../repository/Usuarios/Agente_De_Ventas/Agente.repository';
import { EmpleadoRepository } from '../../../modules/RRHH/repositories/Empleado.repository';
import { UsuarioRepository } from '../../../modules/Seguridad/repositories/Usuario.repository';

export const Cliente_AlmacenService = {
  getAllPaginado: async (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    return await Cliente_AlmacenRepository.getAllPaginado(limit, offset);
  },

  getAllByUsuarioAgente: async (params: {
    id_empleado: string;
    page: number;
    limit: number;
    nombre: string;
    estado: string;
  }) => {
    const agente = await AgenteRepository.getByIdEmpleado(params.id_empleado);
    // console.log('AGENTE');
    //console.log(agente);
    const newParams = {
      id_agente: agente.id_agente, // el que necesita el repository
      page: params.page,
      limit: params.limit,
      nombre: params.nombre,
      estado: params.estado
    };
    return await Cliente_AlmacenRepository.getAllByAgente(newParams);
  },

  getClienteByTermSerch: async (term_serch: string) => {
    return await Cliente_AlmacenRepository.getClienteByTermSerch(term_serch);
  },

  getByIDFlexible: async (id_cliente_alm: string) => {
    return await Cliente_AlmacenRepository.getByIDFlexible(id_cliente_alm);
  },

  create: async (data: ICreateClienteAlmacen) => {
    return await Cliente_AlmacenRepository.create(data);
  },

  update: async (id: string, data: Partial<ICreateClienteAlmacen>) => {
    return await Cliente_AlmacenRepository.update(id, data);
  },
  getUltimoID: async () => {
    return await Cliente_AlmacenRepository.ultimoIdInterno();
  }
};
