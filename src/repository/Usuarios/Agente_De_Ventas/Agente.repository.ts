import { v4 as uuidv4 } from 'uuid';
import { IAgenteDeVentaCreate, IAgente_de_Venta } from '../../../interface/Usuarios/Agente_De_Ventas/Agente.interface';
import Agente_de_Venta from '../../../models/Usuarios/Agente_De_Ventas/Agente_De_Venta';
import id from 'zod/v4/locales/id.js';
import Empleado from '../../../modules/RRHH/model/Empleado';

export const AgenteRepository = {
  getAll: async () => {
    return await Agente_de_Venta.findAll({
      include: [
        { model: Empleado, attributes: ['idinterno_empleado', 'nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }
      ]
    });
  },
  getByID: async (id_agente: string) => {
    return await Agente_de_Venta.findByPk(id_agente);
  },
  getByIdEmpleado: async (id_empleado: string) => {
    return await Agente_de_Venta.findOne({
      where: {
        id_empleado
      }
    });
  },

  createAgente: async (data: IAgenteDeVentaCreate) => {
    const nuevoUUID = uuidv4();
    return await Agente_de_Venta.create({
      id_agente: nuevoUUID,
      ...data
    });
  },
  updateAgente: async (id_agente: string, data: IAgenteDeVentaCreate) => {
    return await Agente_de_Venta.update(data, {
      where: {
        id_agente: id_agente
      }
    });
  }
};
