import {
  ILotesArticuloSucursal,
  ICreaterOrUdateLotesArticuloSucursal
} from '../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface';
import { LotesArticuloSucursalRepository } from '../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository';
import { Op } from 'sequelize';

export const LotesArticuloSucursalService = {
  getAll: async (): Promise<ILotesArticuloSucursal[]> => {
    return await LotesArticuloSucursalRepository.getAll();
  },
  getExistencia: async (id_artic: string, id_sucursal: string) => {
    return await LotesArticuloSucursalRepository.getExistencia(id_artic, id_sucursal);
  },
  getById: async (id: string): Promise<ILotesArticuloSucursal> => {
    const loteartic = await LotesArticuloSucursalRepository.getById(id);
    if (!loteartic) throw new Error('Lote Articulo Sucursal no enocontrado');
    return loteartic;
  },
  getLotesPorCodigoBarra: async (id_empresa: string, cod_barr_artic: string) => {
    return await LotesArticuloSucursalRepository.getLotesPorCodigoBarra(id_empresa, cod_barr_artic);
  },
  getAllByEmpresaArticulo: async (
    id_empre: string,
    id_artic: string,
    opts?: {
      conStock?: boolean;
      estado?: string;
      noVencidos?: boolean;
      ordenar?: 'fefo' | 'fifo' | 'recientes';
    }
  ) => {
    if (!id_empre || !id_artic) {
      throw new Error('Faltan id_empre o id_artic');
    }

    const where: any = { id_empre, id_artic };

    if (opts?.estado) {
      where.estado_lote_sucursal = opts.estado;
    }
    if (opts?.conStock) {
      where.cantidad_lote_sucursal = { [Op.gt]: 0 };
    }
    if (opts?.noVencidos) {
      where.fecha_venci_lote_sucursal = { [Op.gte]: new Date() };
    }

    let order: any[] = [['fecha_venci_lote_sucursal', 'ASC']];
    if (opts?.ordenar === 'fifo') order = [['createdAt', 'ASC']];
    if (opts?.ordenar === 'recientes') order = [['createdAt', 'DESC']];

    return await LotesArticuloSucursalRepository.listByEmpresaArticulo(id_empre, id_artic, {
      where,
      order
    });
  },

  getResumen: async (filters: {
    nombre: string;
    id_sucursal: string;
    grupoPrecio: string;
    page: number;
    limit: number;
  }) => {
    return await LotesArticuloSucursalRepository.getResumen(filters);
  },
  getResumenPromocion: async (filters: {
    id_cliente: string;
    id_sucursal: string;
    grupoPrecio: string;
    page: number;
    limit: number;
  }) => {
    return await LotesArticuloSucursalRepository.getResumenPromocionados(filters);
  },
  create: async (data: ICreaterOrUdateLotesArticuloSucursal) => {
    return LotesArticuloSucursalRepository.create(data);
  }
};
