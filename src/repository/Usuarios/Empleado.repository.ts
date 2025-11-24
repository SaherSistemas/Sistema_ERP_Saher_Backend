import { ICrearEmpleado, IEmpleado, IUpdateEmpleado } from '../../interface/Usuarios/Empleado.interface';
import Empresa_Sucursal from '../../models/Empresa_Sucursal/Empresa_Sucursal';
import Empleado from '../../models/Usuarios/Empleado/Empleado';
import { isUUID } from '../../utils/validaciones';
import { literal, Op, Sequelize, Transaction, UniqueConstraintError, where } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
export const EmpleadoRepository = {
  getAll: async (page: number, limit: number, query: string) => {
    const offset = (page - 1) * limit;
    const whereClause = query
      ? {
          [Op.or]: [
            { nombre_empleado: { [Op.iLike]: `%${query}%` } },
            { ap_pat_empleado: { [Op.iLike]: `%${query}%` } },
            { ap_mat_empleado: { [Op.iLike]: `%${query}%` } },
            { nss_empleado: { [Op.iLike]: `%${query}%` } },
            Sequelize.where(Sequelize.cast(Sequelize.col('idinterno_empleado'), 'TEXT'), {
              [Op.iLike]: `%${query}%`
            })
          ]
        }
      : {};

    const { rows, count } = await Empleado.findAndCountAll({
      include: [
        {
          model: Empresa_Sucursal,
          as: 'empresa',
          attributes: ['nom_empre'] // solo el nombre
        }
      ],
      where: whereClause,
      offset,
      limit,
      order: [['idinterno_empleado', 'ASC']]
    });

    return {
      data: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  },

  getAllEmpleadosQuePuedenSerAgente: async () => {
    return await Empleado.findAll({
      where: {
        id_sucursal_empleado: process.env.EMPRESA_PRINCIPAL_ID,
        id_empleado: { [Op.notIn]: literal('(SELECT id_empleado FROM agente_de_venta)') }
      }
    });
  },
  ultimoId: async () => {
    return await Empleado.findOne({
      order: [['idinterno_empleado', 'DESC']]
    });
  },
  // getByIdFlexible: async (id: string): Promise<Empleado | null> => {
  //     if (isUUID(id)) {
  //         return await Empleado.findByPk(id)
  //     } else if (!isNaN(Number(id))) {
  //         return await Empleado.findOne({ where: { idinterno_empleado: Number(id) } })
  //     }
  //     return null
  // },

  getByIdFlexible: async (id: string | number, options?: { transaction?: Transaction }) => {
    const idStr = String(id);

    if (isUUID(idStr)) {
      return await Empleado.findByPk(idStr, {
        transaction: options?.transaction
      });
    }

    const idNum = Number(idStr);
    if (!isNaN(idNum)) {
      return await Empleado.findOne({
        where: { idinterno_empleado: idNum },
        transaction: options?.transaction
      });
    }

    return null;
  },

  crearEmpleadoNuevo: async (data: ICrearEmpleado) => {
    const nuevoUUID = uuidv4();
    const ultimoID = await EmpleadoRepository.ultimoId();
    const nuevoID = ultimoID ? ultimoID.idinterno_empleado + 1 : 1;
    data.idinterno_empleado = nuevoID;

    try {
      return await Empleado.create({
        id_empleado: nuevoUUID,
        ...data
      });
    } catch (error: any) {
      if (error instanceof UniqueConstraintError) {
        throw new Error('Error: algún campo con restricción única ya existe.');
      }
      throw error; // Otro error desconocido
    }
  },
  updateEmpleado: async (id: string, data: IUpdateEmpleado) => {
    const empleado = await EmpleadoRepository.getByIdFlexible(id);
    if (!empleado) return null;
    return await empleado.update(data);
  },
  statusActualEmpleado: async (id: string) => {
    const empleado = await EmpleadoRepository.getByIdFlexible(id);
    if (!empleado) return null;
    return empleado.estatus_empleado;
  },
  cambiarStatus: async (id: string, statusContrario: boolean) => {
    const empleado = await EmpleadoRepository.getByIdFlexible(id);
    if (!empleado) return null;
    return await empleado.update({ estatus_empleado: statusContrario });
  }
};
