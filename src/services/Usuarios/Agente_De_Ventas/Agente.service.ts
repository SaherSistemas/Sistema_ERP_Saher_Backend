import { IAgente_de_Venta, IAgenteDeVentaCreate } from '../../../interface/Usuarios/Agente_De_Ventas/Agente.interface';
import { AgenteRepository } from '../../../repository/Usuarios/Agente_De_Ventas/Agente.repository';
import { EmpleadoRepository } from '../../../repository/Usuarios/Empleado.repository';
import { isUUID } from '../../../utils/validaciones';

export const AgenteService = {
  getAllAgentes: async () => {
    return await AgenteRepository.getAll();
  },
  getAgenteByID: async (id: string) => {
    const agente = await AgenteRepository.getByID(id);
    if (!agente) throw new Error('Agente no encontrado');
    return agente;
  },
  createAgente: async (data: IAgenteDeVentaCreate) => {
    if (!isUUID(data.id_empleado) && !isNaN(Number(data.id_empleado))) {
      const empleado = await EmpleadoRepository.getByIdFlexible(data.id_empleado);
      if (!empleado) throw new Error('El empleado proporcionado no existe');
      data.id_empleado = empleado.id_empleado;
    }
    if (data.id_bodega_local === '' || data.id_bodega_local === undefined) {
      data.id_bodega_local = null;
    }

    return await AgenteRepository.createAgente(data);
  },
  updateAgente: async (id: string, data: IAgenteDeVentaCreate) => {
    if (data.id_empleado) {
      if (!isUUID(data.id_empleado) && !isNaN(Number(data.id_empleado))) {
        const empleado = await EmpleadoRepository.getByIdFlexible(data.id_empleado);
        if (!empleado) throw new Error('El empleado proporcionado no existe.');
        data.id_empleado = empleado.id_empleado;
      }
    }
  }
};
