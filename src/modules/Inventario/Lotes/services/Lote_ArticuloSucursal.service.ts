import {
  ILotesArticuloSucursal,
  ICreaterOrUdateLotesArticuloSucursal
} from '../../../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface';
import { fn, col, Op } from 'sequelize';
import { LotesArticuloSucursalRepository } from '../repository/Lote_ArticuloSucursal.repository';
import Stock_Ubicacion_Lote from '../../Stock/model/Stock_Ubicacion_Lote';

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
      where.cantidad_entrada_lote = { [Op.gt]: 0 };
    }
    if (opts?.noVencidos) {
      where.fecha_venci_lote_sucursal = { [Op.gte]: new Date() };
    }

    let order: any[] = [['fecha_venci_lote_sucursal', 'ASC']];
    if (opts?.ordenar === 'fifo') order = [['createdAt', 'ASC']];
    if (opts?.ordenar === 'recientes') order = [['createdAt', 'DESC']];

    const lotes = await LotesArticuloSucursalRepository.listByEmpresaArticulo(id_empre, id_artic, {
      where,
      order
    });

    if (!lotes.length) return [];

    // Suma el stock real de stock_ubicacion_lote por lote
    const loteIds = lotes.map(l => l.id_lote_sucursal);
    const stockRows = await Stock_Ubicacion_Lote.findAll({
      where: { id_lote: loteIds, id_empresa_sucursal: id_empre },
      attributes: ['id_lote', [fn('SUM', col('cantidad')), 'cantidad_total']],
      group: ['id_lote'],
      raw: true,
    }) as any[];

    const stockMap = new Map<string, number>(
      stockRows.map(s => [s.id_lote, Number(s.cantidad_total ?? 0)])
    );

    return lotes.map(l => {
      const json = l.toJSON() as any;
      json.cantidad_lote_sucursal = stockMap.get(l.id_lote_sucursal) ?? 0;
      return json;
    });
  },
  getExistenciaTotal: async (id_empre: string, id_artic: string): Promise<number> => {
    const lotes = await LotesArticuloSucursalService.getAllByEmpresaArticulo(
      id_empre,
      id_artic,
      { conStock: true, noVencidos: true, ordenar: 'fefo' }
    );

    const total = lotes.reduce(
      (sum, lote) => sum + Number(lote.cantidad_entrada_lote || 0),
      0
    );
    return total;
  },

  /** Suma existencias no vencidas y con stock de un artículo en varias empresas */
  getExistenciaTotalPorEmpresas: async (id_artic: string, ids_empresas: string[]): Promise<number> => {
    const resultados = await Promise.all(
      ids_empresas.map(id_empre =>
        LotesArticuloSucursalService.getExistenciaTotal(id_empre, id_artic).catch(() => 0)
      )
    );
    return resultados.reduce((acc, n) => acc + n, 0);
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
  /*
    getResumenPromocion: async (filters: {
      id_cliente: string;
      id_sucursal: string;
      grupoPrecio: string;
      page: number;
      limit: number;
    }) => {
      return //await LotesArticuloSucursalRepository.getResumenPromocionados(filters);
    },*/
  create: async (data: ICreaterOrUdateLotesArticuloSucursal) => {
    return LotesArticuloSucursalRepository.create(data);
  },

  getHistorialEntradas: async (id_artic: string, id_empresa?: string) => {
    return LotesArticuloSucursalRepository.getHistorialEntradas(id_artic, id_empresa);
  },
};
