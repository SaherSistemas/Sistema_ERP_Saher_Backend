import { ICrearEmpleado, IEmpleado, IUpdateEmpleado } from '../interface/Empleado.interface';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Empleado from '../model/Empleado';
import { isUUID } from '../../../utils/validaciones';
import { literal, Op, QueryTypes, Sequelize, Transaction, UniqueConstraintError, where } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Empresa_SucursalRepository } from '../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { dbLocal } from '../../../config/db';
export const EmpleadoRepository = {
  getAll: async (page: number, limit: number, query: string, idEmpresa?: string) => {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (query) {
      conditions.push({
        [Op.or]: [
          { nombre_empleado: { [Op.iLike]: `%${query}%` } },
          { ap_pat_empleado: { [Op.iLike]: `%${query}%` } },
          { ap_mat_empleado: { [Op.iLike]: `%${query}%` } },
          { nss_empleado: { [Op.iLike]: `%${query}%` } },
          Sequelize.where(Sequelize.cast(Sequelize.col('idinterno_empleado'), 'TEXT'), {
            [Op.iLike]: `%${query}%`
          })
        ]
      });
    }

    if (idEmpresa) {
      conditions.push({ id_sucursal_empleado: idEmpresa });
    }

    const whereClause = conditions.length ? { [Op.and]: conditions } : {};

    const { rows, count } = await Empleado.findAndCountAll({
      include: [
        {
          model: Empresa_Sucursal,
          as: 'empresa',
          attributes: ['nom_empre']
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
    const empresaPrincipal = await Empresa_SucursalRepository.getEmpresaPrincipal();
    const where: any = {
      id_empleado: { [Op.notIn]: literal('(SELECT id_empleado FROM agente_de_venta)') }
    };
    if (empresaPrincipal?.id_empre) {
      where.id_sucursal_empleado = empresaPrincipal.id_empre;
    }
    return await Empleado.findAll({ where });
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
  },

  sinUsuario: async () => {
    return dbLocal.query<{
      id_empleado: string; nombre_empleado: string;
      ap_pat_empleado: string; ap_mat_empleado: string; nom_empre: string;
    }>(
      `SELECT e.id_empleado, e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado,
              es.nom_empre
       FROM empleado e
       LEFT JOIN empresa_sucursal es ON es.id_empre = e.id_sucursal_empleado
       WHERE e.id_empleado NOT IN (
           SELECT id_referencia_persona FROM usuario WHERE id_referencia_persona IS NOT NULL
       )
       ORDER BY e.nombre_empleado ASC`,
      { type: QueryTypes.SELECT }
    );
  },

  getByNombreRol: async (nom_rol: string, query: string = '') => {
    const params: any[] = [`%${nom_rol}%`];
    let filtroNombre = '';
    if (query) {
      params.push(`%${query}%`);
      filtroNombre = `AND (e.nombre_empleado ILIKE $${params.length} OR e.ap_pat_empleado ILIKE $${params.length} OR e.ap_mat_empleado ILIKE $${params.length})`;
    }
    return dbLocal.query<any>(
      `SELECT DISTINCT e.id_empleado, e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado,
              e.idinterno_empleado AS num_interno_empleado
       FROM empleado e
       INNER JOIN usuario u ON u.id_referencia_persona = e.id_empleado AND u.status_user = true
       INNER JOIN rol r ON r.id_rol = u.idrol_user AND r.nom_rol ILIKE $1
       WHERE e.estatus_empleado = true
       ${filtroNombre}
       ORDER BY e.nombre_empleado ASC`,
      { type: QueryTypes.SELECT, bind: params }
    );
  },
};
