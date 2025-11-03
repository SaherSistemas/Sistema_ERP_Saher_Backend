import { v4 as uuidv4 } from "uuid";
import Asignacion_Empleado_Sucursal from "../../models/Presupuestos/Asignacion_Empleado_Sucursal";
import { ICreateOrUpdateAsignacion_Empleado_Sucursal } from "../../interface/Presupuestos/Asignacion_Empleado_Sucursal.interface";
import { isUUID } from "../../utils/validaciones";
import Presupuesto_Empresa from "../../models/Presupuestos/Presupuesto_Empresa";
import { Transaction } from "sequelize";

export const Asignacion_Empleado_SucursalRepository = {
  getAll: async () => {
    return await Asignacion_Empleado_Sucursal.findAll();
  },

  getAllEmpleado: async (id_empleado: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empleado },
    });
  },
  create: async (data: ICreateOrUpdateAsignacion_Empleado_Sucursal, transaction: Transaction) => {
    return await Asignacion_Empleado_Sucursal.create({
      id_asignacion: uuidv4(),
      ...data,
    }, { transaction });
  },

  update: async (
    id_asignacion: string,
    data: ICreateOrUpdateAsignacion_Empleado_Sucursal,
    transaction: Transaction
  ) => {
    if (!isUUID(id_asignacion)) return null;
    const asignacion = await Asignacion_Empleado_Sucursal.findByPk(
      id_asignacion
    );

    if (!asignacion) return null;
    await asignacion.update(data, { transaction });
    return asignacion;
  },

  getByID: async (id_asignacion: string) => {
    if (isUUID(id_asignacion)) {
      return await Asignacion_Empleado_Sucursal.findByPk(id_asignacion);
    }
  },

  delete: async (id_asignacion: string, transaction?: any) => {
    const asignacion = await Asignacion_Empleado_Sucursal.findByPk(
      id_asignacion,
      { transaction }
    );
    if (!asignacion) return null;

    await asignacion.destroy({ transaction });
    return asignacion;
  },

  getAsignacionesEmpleado: async (id_empleado: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empleado: id_empleado },
    });
  },

  getAsignacionesSucursal: async (id_empre: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empre: id_empre },
    });
  },

  getActivasPorEmpleado: async (id_empleado: string) => {
    return await Asignacion_Empleado_Sucursal.findAll({
      where: { id_empleado, activo: true },
    });
  },
  

  
};
