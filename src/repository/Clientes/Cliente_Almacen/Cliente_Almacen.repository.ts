import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { isUUID } from '../../../utils/validaciones';
import { ICreateClienteAlmacen } from '../../../interface/Clientes/Cliente_Almacen/Cliente_Almacen.interface';
import Agente_de_Venta from '../../../modules/Comercial/Agente_Venta/model/Agente_De_Venta';
import Empleado from '../../../modules/RRHH/model/Empleado';
import { dbLocal } from '../../../config/db';
import { QueryTypes } from 'sequelize';

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

  // POR AGENTE — incluye pedido en captura, cotización y saldo en un solo query
  getAllByAgente: async ({ id_agente, page, limit, nombre, estado }) => {
    const offset = (page - 1) * limit;

    const nombreFilter = nombre && nombre.trim() !== ''
      ? `AND (ca.razon_social_cliente_alm ILIKE :nombre OR ca.nom_corto_cliente_alm ILIKE :nombre OR ca.num_telefono_cliente_alm ILIKE :nombre OR ca.rfc_cliente_alm ILIKE :nombre)`
      : '';
    const estadoFilter = estado === 'A'
      ? `AND ca.activo_cliente_alm = true`
      : estado === 'L'
      ? `AND ca.activo_cliente_alm = false`
      : '';

    const replacements: any = { id_agente, limit, offset };
    if (nombre && nombre.trim() !== '') replacements.nombre = `%${nombre.trim()}%`;

    const [countResult] = await dbLocal.query<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM cliente_almacen ca
      WHERE ca.id_agente_cliente_alm = :id_agente
      ${nombreFilter} ${estadoFilter}
    `, { replacements, type: QueryTypes.SELECT });

    const items = await dbLocal.query<any>(`
      SELECT
        ca.id_cliente_alm,
        ca.id_interno_cliente_alm,
        ca.razon_social_cliente_alm,
        ca.nom_corto_cliente_alm,
        ca.activo_cliente_alm,
        ca.num_telefono_cliente_alm,
        ca.rfc_cliente_alm,
        -- Pedido en captura (más reciente)
        (SELECT id_pedido_alm FROM pedido_almacen
         WHERE id_cliente_pedido_alm = ca.id_cliente_alm
           AND status_pedido_alm = 'EC'
         ORDER BY "createdAt" DESC LIMIT 1) AS id_pedido_captura,
        -- Cotización pendiente
        (SELECT id_pedido_alm FROM pedido_almacen
         WHERE id_cliente_pedido_alm = ca.id_cliente_alm
           AND status_pedido_alm = 'CO'
         ORDER BY "createdAt" DESC LIMIT 1) AS id_pedido_cotizacion,
        -- Saldo pendiente en CxC
        COALESCE((
          SELECT SUM(saldo_pendiente)
          FROM cuenta_por_cobrar
          WHERE id_cliente_alm = ca.id_cliente_alm
            AND estatus_cxc IN ('PEN','PAR','VEN')
        ), 0) AS saldo_pendiente_cxc
      FROM cliente_almacen ca
      WHERE ca.id_agente_cliente_alm = :id_agente
      ${nombreFilter} ${estadoFilter}
      ORDER BY ca."createdAt" DESC
      LIMIT :limit OFFSET :offset
    `, { replacements, type: QueryTypes.SELECT });

    const count = Number(countResult.total);
    return {
      items: items.map(r => ({
        ...r,
        saldo_pendiente_cxc: Number(r.saldo_pendiente_cxc),
      })),
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
