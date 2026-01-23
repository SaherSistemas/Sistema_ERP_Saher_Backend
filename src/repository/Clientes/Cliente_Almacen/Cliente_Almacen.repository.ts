import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { isUUID } from '../../../utils/validaciones';
import { ICreateClienteAlmacen } from '../../../interface/Clientes/Cliente_Almacen/Cliente_Almacen.interface';
import Agente_de_Venta from '../../../modules/Ventas/Agente_Venta/model/Agente_De_Venta';
import Empleado from '../../../modules/RRHH/model/Empleado';

export const Cliente_AlmacenRepository = {
  // PAGINADO
  getAllPaginado: async (limit: number, offset: number) => {
    const { count, rows } = await Cliente_Almacen.findAndCountAll({
      limit,
      offset,
      order: [['id_interno_cliente_alm', 'DESC']],
      include: [
        {
          model: Agente_de_Venta,
          attributes: ['cod_identi_agente'],
          include: [
            {
              model: Empleado,
              attributes: ['nombre_empleado', 'ap_pat_empleado']
            }
          ]
        }
      ]
    });

    return { total: count, data: rows };
  },

  // POR AGENTE
  getAllByAgente: async ({ id_agente, page, limit, nombre, estado }) => {
    const offset = (page - 1) * limit;

    const where: any = {
      id_agente_cliente_alm: id_agente
    };

    if (nombre && nombre.trim() !== '') {
      const term = `%${nombre.trim()}%`;

      where[Op.or] = [
        { nombre_cliente_alm: { [Op.iLike]: term } },
        { razon_social_cliente_alm: { [Op.iLike]: term } },
        { num_telefono_cliente_alm: { [Op.iLike]: term } },
        { rfc_cliente_alm: { [Op.iLike]: term } }
      ];
    }

    if (estado === 'A') {
      where.activo_cliente_alm = true;
    } else if (estado === 'L') {
      where.activo_cliente_alm = false;
    }

    const { rows, count } = await Cliente_Almacen.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      items: rows,
      totalItems: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  },
  // BUSCAR POR TERMINO
  getClienteByTermSerch: async (term_serch: string) => {
    return await Cliente_Almacen.findAll({
      where: {
        [Op.or]: [
          { razon_social_cliente_alm: { [Op.iLike]: `%${term_serch}%` } },
          { nom_corto_cliente_alm: { [Op.iLike]: `%${term_serch}%` } }
        ]
      },
      limit: 20,
      order: [['razon_social_cliente_alm', 'ASC']]
    });
  },

  // ID flexible (UUID o número interno)
  getByIDFlexible: async (id_cliente_alm: string) => {
    if (isUUID(id_cliente_alm)) {
      return await Cliente_Almacen.findByPk(id_cliente_alm);
    }
    return await Cliente_Almacen.findOne({
      where: { id_interno_cliente_alm: id_cliente_alm }
    });
  },

  //ULTIMO ID_INTERNO SMALLINT
  ultimoIdInterno: async () => {
    const ultimo_id_interno = await Cliente_Almacen.findOne({
      attributes: ['id_interno_cliente_alm'],
      order: [['id_interno_cliente_alm', 'DESC']]
    });
    return ultimo_id_interno ? ultimo_id_interno.id_interno_cliente_alm : 0;
  },
  // CREATE
  create: async (data: ICreateClienteAlmacen) => {
    const newUUID = uuidv4();
    const siguienteIdInterno = await Cliente_AlmacenRepository.ultimoIdInterno();
    const sig = siguienteIdInterno + 1;
    return await Cliente_Almacen.create({
      id_cliente_alm: newUUID,
      id_interno_cliente_alm: sig,
      ...data
    });
  },

  // UPDATE
  update: async (id_cliente_alm: string, data: Partial<ICreateClienteAlmacen>) => {
    const cliente = await Cliente_Almacen.findByPk(id_cliente_alm);
    if (!cliente) return null;

    await cliente.update(data);
    return cliente;
  }
};
