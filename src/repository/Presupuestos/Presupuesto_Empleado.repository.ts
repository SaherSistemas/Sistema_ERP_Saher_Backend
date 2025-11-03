import { ICreateOrUpdatePresupuestoEmpleado } from "../../interface/Presupuestos/Presupuesto_Empleado.interface";
import Presupuesto_Empleado from "../../models/Presupuestos/Presupuesto_Empleado";
import { isUUID } from "../../utils/validaciones";
import { Op, WhereOptions } from "sequelize";
import { v4 as uuidv4 } from "uuid";

import { Transaction } from "sequelize";
import Presupuesto_Empresa from "../../models/Presupuestos/Presupuesto_Empresa";
import Empleado from "../../models/Usuarios/Empleado/Empleado";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Asignacion_Empleado_Sucursal from "../../models/Presupuestos/Asignacion_Empleado_Sucursal";

export const Presupuesto_EmpleadoRepository = {
  getAll: async () => {
    return await Presupuesto_Empleado.findAll(
      {
        include: [
          {
            model: Empleado,
            attributes: [
              "nombre_empleado",
              "ap_pat_empleado",
              "ap_mat_empleado"
            ],
          },
          {
            model: Empresa_Sucursal,
            attributes: ["nom_empre"]
          },
          {
            model: Presupuesto_Empresa,
            attributes: ["anio", "mes"]
          }
        ],
      }
    );
  },

  create: async (
    data: ICreateOrUpdatePresupuestoEmpleado,
    transaction: Transaction
  ) => {
    return await Presupuesto_Empleado.create(
      {
        id_presupuesto_empleado: uuidv4(),
        ...data,
      },
      { transaction }
    );
  },


  // getPresupuestoPorEmpleado: async (id_empleado: string, id_empre: string, id_presupuesto: string) => {
  //   return await Presupuesto_Empleado.findAll({
  //     where: { id_empleado, id_empre, id_presupuesto },
  //   });
  // },

  getEmpleadosNoAsignados: async (id_empre: string, id_presupuesto: string) => {
    const asignados = await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      attributes: ["id_empleado"],
    });

    const idsAsignados = asignados.map((a) => a.id_empleado);



    const disponibles = await Empleado.findAll({
      include: [
        {
          model: Asignacion_Empleado_Sucursal,
          as: "asignaciones",
          where: {
            id_empre,
            activo: true,
          },
          required: true,
        },
      ],
      where: idsAsignados.length
        ? { id_empleado: { [Op.notIn]: idsAsignados } }
        : {},
      attributes: [
        "id_empleado",
        "nombre_empleado",
        "ap_pat_empleado",
        "ap_mat_empleado",
        "id_sucursal_empleado"
      ],
      order: [["nombre_empleado", "ASC"]],
    });
    return disponibles;
  },

  findByPresupuesto: async (
    id_presupuesto: string,
    transaction?: Transaction) => {
    return await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      transaction,
    });
  },

  updateTotalesPresupuestoEmpresa: async (
    id_presupuesto: string,
    transaction?: Transaction) => {
    const empleados = await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      transaction,
    });

    const total_turnos = empleados.reduce(
      (acc, e) => acc + e.turnos_planeado,
      0
    );

    const presupuesto = await Presupuesto_Empresa.findByPk(id_presupuesto, {
      transaction,
    });

    if (!presupuesto) throw new Error("Presupuesto empresa no encontrado");

    const monto_por_turno =
      total_turnos > 0 ? presupuesto.monto_total / total_turnos : 0;

    presupuesto.turnos_planeados = total_turnos;
    presupuesto.monto_por_turno = monto_por_turno;

    await presupuesto.save({ transaction });

    for (const emp of empleados) {
      const nuevoMonto = emp.turnos_planeado * monto_por_turno;
      if (emp.monto_planeado !== nuevoMonto) {
        emp.monto_planeado = nuevoMonto;
        await emp.save({ transaction });
      }
    }

    return {
      total_turnos,
      monto_por_turno,
      empleados_actualizados: empleados.length,
    };
  },

  update: async (
    id_presupuesto_empleado: string,
    data: ICreateOrUpdatePresupuestoEmpleado) => {
    if (!isUUID(id_presupuesto_empleado)) return null;
    const presupuesto_empleado = await Presupuesto_Empleado.findByPk(
      id_presupuesto_empleado
    );

    if (!presupuesto_empleado) return null;
    await presupuesto_empleado.update(data);
    return presupuesto_empleado;
  },

  getByID: async (id_presupuesto_empleado: string) => {
    return await Presupuesto_Empleado.findByPk(id_presupuesto_empleado, {
      include: [
        {
          model: Empleado,
          attributes: [
            "nombre_empleado",
            "ap_pat_empleado",
            "ap_mat_empleado",
            // "departamento_empleado",
            // "puesto_empleado"
          ],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["nom_empre"],
        },
      ],
    });
  },

  getByPresupuesto: async (id_presupuesto: string) => {
    const empleados = await Presupuesto_Empleado.findAll({
      where: { id_presupuesto },
      include: [
        {
          model: Empleado,
          attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"],
        },
        {
          model: Empresa_Sucursal,
          attributes: ["nom_empre"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const presupuesto = await Presupuesto_Empresa.findByPk(id_presupuesto, {
      attributes: [
        "id_presupuesto",
        "monto_total",
        "monto_por_turno",
        "turnos_planeados",
      ],
    });

    return { presupuesto, empleados };
  },

  delete: async (id_presupuesto_empleado: string, transaction?: any) => {
    const empleado = await Presupuesto_Empleado.findByPk(
      id_presupuesto_empleado,
      { transaction }
    );
    if (!empleado) return null;

    await empleado.destroy({ transaction });
    return empleado;
  },
};
