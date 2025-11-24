import Lote_sucursal_articulo from '../../models/LotesYCaducidad/Lote_ArticuloSucursal';
import {
  ILotesArticuloSucursal,
  ICreaterOrUdateLotesArticuloSucursal,
  IResumenArticulo,
  ICompraAgrupada,
} from '../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface';

import { isUUID } from '../../utils/validaciones';
import { v4 as uuidv4 } from 'uuid';
import { ArticuloRepository } from '../Articulos/Articulo.repository';
import { Op, Sequelize, Transaction, FindOptions, fn, col, literal } from 'sequelize';
import Articulo from '../../models/Articulos/Articulo';
import { Pedido_AlmacenRepository } from '../Pedido_Almacen/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../Pedido_Almacen/Detalle_Pedido_Almacen.repository';
import { Detalle_Compra_RecibidosRepository } from '../Compras/Detalle_Compra_Recibido.repository';
import { Detalle_Compra_SolicitadoRepository } from '../Compras/Detalle_Compra_Solicitado.repository';
import DetalleListaPrecio from '../../models/Costo_Y_Precio/Lista_Precios/Detalle_Lista_Precio';
import { DetalleListaPreciosRepository } from '../Costo_Y_Precio/Lista_Precio/Detalle_Lista_Precio.repository';
type RepoOpts = FindOptions;

export const LotesArticuloSucursalRepository = {
  getAll: async (id_empre?: string, id_artic?: string) => {
    const where: any = {};

    if (id_empre) {
      where.id_empre = id_empre;
    }

    if (id_artic) {
      where.id_artic = id_artic;
    }

    return await Lote_sucursal_articulo.findAll({
      where,
      attributes: ['id_lote_sucursal'],
      raw: true
    });
  },
  getExistencia: async (id_artic: string, id_sucursal: string) => {
    // 1. Consulta principal: totales
    const result: any = await Lote_sucursal_articulo.findOne({
      attributes: [
        [fn('SUM', col('cantidad_lote_sucursal')), 'existencia_total'],
        [fn('SUM', literal(`cantidad_lote_sucursal - COALESCE(cantidad_apartada_lote, 0)`)), 'existencia_disponible'],
        [fn('MIN', col('fecha_venci_lote_sucursal')), 'fecha_caduca_mas_corta']
      ],
      where: {
        id_artic,
        id_empre: id_sucursal
      },
      raw: true
    });

    // No hay existencias
    if (!result || !result.existencia_total) {
      return {
        existencia_total: 0,
        existencia_disponible: 0,
        fecha_caduca_mas_corta: null,
        lote_mas_corto: null
      };
    }

    const fechaMin = result.fecha_caduca_mas_corta;

    // 2. Lote más corto (solo si hay fecha mínima)
    let lote = null;
    if (fechaMin) {
      lote = await Lote_sucursal_articulo.findOne({
        where: {
          id_artic,
          id_empre: id_sucursal,
          fecha_venci_lote_sucursal: fechaMin
        },
        attributes: ['numero_lote_sucursal'],
        raw: true
      });
    }

    return {
      existencia_total: Number(result.existencia_total),
      existencia_disponible: Number(result.existencia_disponible),
      fecha_caduca_mas_corta: fechaMin,
      lote_mas_corto: lote ? lote.numero_lote_sucursal : null
    };
  },
  getResumen: async ({ nombre, grupoPrecio, id_sucursal, page, limit }) => {
    const offset = (page - 1) * limit;

    // 1. Total de artículos (DISTINCT)
    const total = await Lote_sucursal_articulo.count({
      distinct: true,
      col: 'id_artic',
      include: [
        {
          model: Articulo,
          attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva'],
          where: {
            [Op.or]: [
              { des_artic: { [Op.iLike]: `%${nombre}%` } },
              { cod_barr_artic: { [Op.iLike]: `%${nombre}%` } },
              { des_gener_artic: { [Op.iLike]: `%${nombre}%` } }
            ]
          }
        }
      ],
      where: { id_empre: id_sucursal }
    });
    const totalPages = Math.ceil(total / limit);


    const items: any[] = await Lote_sucursal_articulo.findAll({
      attributes: [
        'id_artic',
        [fn('SUM', col('cantidad_lote_sucursal')), 'existencia_total'],
        [fn('SUM', literal(`cantidad_lote_sucursal - COALESCE(cantidad_apartada_lote, 0)`)), 'existencia_disponible'],
        [fn('MIN', col('fecha_venci_lote_sucursal')), 'fecha_caduca_mas_corta']
      ],
      where: {
        id_empre: id_sucursal
      },
      include: [
        {
          model: Articulo,
          attributes: ['id_artic', 'cod_int_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva'],
          where: {
            [Op.or]: [
              { des_artic: { [Op.iLike]: `%${nombre}%` } },
              { cod_barr_artic: { [Op.iLike]: `%${nombre}%` } },
              { des_gener_artic: { [Op.iLike]: `%${nombre}%` } }
            ]
          }
        }
      ],
      group: [
        'LoteArticuloSucursal.id_artic',
        'articulo.id_artic'
      ],
      offset,
      limit
    });


    for (const item of items) {
      const fechaMin = item.get('fecha_caduca_mas_corta');

      if (!fechaMin) {
        item.setDataValue('lote_mas_corto', null);
        continue;
      }

      const lote = await Lote_sucursal_articulo.findOne({
        where: {
          id_artic: item.id_artic,
          id_empre: id_sucursal,
          fecha_venci_lote_sucursal: fechaMin
        },
        attributes: ['numero_lote_sucursal'],
        raw: true
      });

      //  console.log(item);
      //PRECIO
      const precio = await DetalleListaPreciosRepository.getByArticulo(item.id_artic, grupoPrecio);

      // setear precio en el item
      item.setDataValue('precio', precio ? Number(precio.precios) : null);

      item.setDataValue('lote_mas_corto', lote ? lote.numero_lote_sucursal : null);

      const pedidas = await Detalle_Compra_SolicitadoRepository.getCantidadPedidaPorArticulo(item.id_artic);
      item.setDataValue('pedidas', pedidas);

      const transito = await Detalle_Compra_RecibidosRepository.getCantidadTransitoPorArticulo(item.id_artic);
      item.setDataValue('transito', transito);
    }

    // 4. Mapear a tu interface final

    const resultado: IResumenArticulo[] = items.map((item: any) => {
      const articulo = item.getDataValue('articulo');

      return {
        id_artic: item.id_artic,

        descripcion: articulo?.des_artic || null,
        descripcion_generica: articulo?.des_gener_artic || null,
        iva: articulo?.tipo_de_iva || null,
        codigo_interno: articulo?.cod_int_artic || null,

        existencia_total: Number(item.get('existencia_total')),
        existencia_disponible: Number(item.get('existencia_disponible')),

        fecha_caduca_mas_corta: item.get('fecha_caduca_mas_corta'),
        lote_mas_corto: item.get('lote_mas_corto'),

        precio: item.get('precio'),

        // ✔ AGREGAR ESTOS 2 CAMPOS
        pedidas: Number(item.get('pedidas') || 0),
        transito: Number(item.get('transito') || 0)
      };
    });

    return { items: resultado, totalPages };
  },
  getResumenPromocionados: async ({ id_cliente, grupoPrecio, id_sucursal, page, limit }) => {
    const offset = (page - 1) * limit;

    // 1. Últimos 3 pedidos facturados
    const pedidos = await Pedido_AlmacenRepository.getPedidosByClienteFacturados(id_cliente);
    console.log(pedidos)
    const ids = pedidos.map(p => p.id_pedido_alm);

    if (ids.length === 0) {
      return { items: [], totalPages: 0 };
    }

    // 2. Detalles + artículos
    const detallesTodos = await Promise.all(ids.map(id => Detalle_Pedido_AlmacenRepository.findByIDPedido(id)));

    const detalles = detallesTodos.flat();

    // 3. Agrupar por artículo
    const comprasAgrupadas: Record<string, ICompraAgrupada> = detalles.reduce((acc, det) => {
      const articulo = det.dataValues.articulo.dataValues;
      const id = det.id_articulo;

      if (!acc[id]) {
        acc[id] = {
          articulo,
          cantidad_total: 0,
          cantidad_total_checada: 0
        };
      }

      acc[id].cantidad_total += Number(det.cant_pedida);
      acc[id].cantidad_total_checada += Number(det.cantidad_checada);

      return acc;
    }, {});

    const articulosPromocion = Object.values(comprasAgrupadas);

    // PAGINACIÓN MANUAL
    const total = articulosPromocion.length;
    const totalPages = Math.ceil(total / limit);

    const articulosPagina = articulosPromocion.slice(offset, offset + limit);

    // 4. Completar datos
    const resultado: any[] = [];

    for (const item of articulosPagina) {
      const art = item.articulo;
      const id_artic = art.id_artic;

      // EXISTENCIAS
      const exist = await Lote_sucursal_articulo.findOne({
        where: { id_artic, id_empre: id_sucursal },
        attributes: [
          [fn('SUM', col('cantidad_lote_sucursal')), 'existencia_total'],
          [fn('SUM', literal(`cantidad_lote_sucursal - COALESCE(cantidad_apartada_lote, 0)`)), 'existencia_disponible'],
          [fn('MIN', col('fecha_venci_lote_sucursal')), 'fecha_caduca_mas_corta']
        ],
        raw: true
      });

      const existencia_total = Number((exist as any)['existencia_total'] || 0);
      const existencia_disponible = Number((exist as any)['existencia_disponible'] || 0);
      const fechaMin = (exist as any)['fecha_caduca_mas_corta'];

      let lote_mas_corto = null;
      if (fechaMin) {
        const lote = await Lote_sucursal_articulo.findOne({
          where: { id_artic, id_empre: id_sucursal, fecha_venci_lote_sucursal: fechaMin },
          attributes: ['numero_lote_sucursal'],
          raw: true
        });
        lote_mas_corto = lote ? lote.numero_lote_sucursal : null;
      }

      // PRECIO
      const precio = await DetalleListaPreciosRepository.getByArticulo(id_artic, grupoPrecio);

      // PEDIDAS (C, A, E)
      const pedidasRow = await Detalle_Compra_SolicitadoRepository.getCantidadPedidaPorArticulo(id_artic);
      const pedidas = Number(pedidasRow ?? 0);
      //     console.log('PEDIDAS ROW:', pedidas);
      // TRANSITO (L, K, R, H)
      const transitoRow = await Detalle_Compra_RecibidosRepository.getCantidadTransitoPorArticulo(id_artic);
      const transito = Number(transitoRow ?? 0);
      //console.log('TRANSITO ROW:', transitoRow);
      // ARMADO FINAL
      resultado.push({
        id_artic,
        descripcion: art.des_artic,
        descripcion_generica: art.des_gener_artic,
        iva: art.tipo_de_iva,
        codigo_interno: art.cod_int_artic,

        existencia_total,
        existencia_disponible,
        fecha_caduca_mas_corta: fechaMin,
        lote_mas_corto,

        precio: precio ? Number(precio.precios) : null,

        cantidad_total: item.cantidad_total,
        cantidad_total_checada: item.cantidad_total_checada,

        pedidas, // P
        transito // T
      });
    }

    return { items: resultado, totalPages };
  },

  getById: async (id: string) => {
    if (isUUID(id)) {
      return await Lote_sucursal_articulo.findByPk(id);
    }
  },

  listByEmpresaArticulo: async (id_empre: string, id_artic: string, options: RepoOpts = {}) => {
    return await Lote_sucursal_articulo.findAll({
      where: { id_empre, id_artic },
      ...options
    });
  },

  getLotesPorCodigoBarra: async (cod_barr_artic: string, id_empre: string) => {
    const articulo = await ArticuloRepository.getByIDFlexible(cod_barr_artic);
    if (!articulo) throw new Error('Artículo no encontrado');

    const id_artic = articulo.id_artic;

    return Lote_sucursal_articulo.findAll({
      where: {
        id_empre,
        id_artic,
        cantidad_lote_sucursal: { [Op.gt]: 0 }
      },
      attributes: ['id_lote_sucursal', 'fecha_venci_lote_sucursal', 'numero_lote_sucursal', 'cantidad_lote_sucursal'],
      order: [['fecha_venci_lote_sucursal', 'ASC']],
      limit: 1
    });
  },

  findByPkInEmpresaArticulo: async (
    id_lote_sucursal: string,
    id_empre: string,
    id_artic: string,
    options: FindOptions = {}
  ) => {
    return await Lote_sucursal_articulo.findOne({
      where: {
        id_lote_sucursal,
        id_empre,
        id_artic
      },
      ...options
    });
  },

  descontarStockLotes: async (
    lotesVendidos: {
      numero_lote_sucursal: string;
      cantidad_lote_sucursal: number;
    }[]
  ) => {
    for (const lote of lotesVendidos) {
      await Lote_sucursal_articulo.update(
        {
          cantidad_lote_sucursal: Sequelize.literal(`cantidad_lote_sucursal - ${lote.cantidad_lote_sucursal}`)
        },
        {
          where: {
            numero_lote_sucursal: lote.numero_lote_sucursal,
            cantidad_lote_sucursal: { [Op.gte]: lote.cantidad_lote_sucursal }
          }
        }
      );
    }
  },

  llevarmeCostosDeLotesExistentesEnVariasEmpresas: async (
    id_artic: string,
    ids_Empresas: string[],
    options?: { transaction?: Transaction }
  ) => {
    const lotesExistencia = await Lote_sucursal_articulo.findAll({
      attributes: ['cantidad_lote_sucursal', 'precio_costo_lote_sucursal'],
      where: {
        id_artic,
        id_empre: ids_Empresas,
        cantidad_lote_sucursal: { [Op.gt]: 0 }
      },
      raw: true,
      transaction: options?.transaction
    });

    let totalCosto = 0;
    let totalCantidad = 0;

    for (const lote of lotesExistencia) {
      const costo = lote.precio_costo_lote_sucursal;
      const cantidad = lote.cantidad_lote_sucursal;

      totalCosto += costo * cantidad;
      totalCantidad += cantidad;
    }

    const costoPromedio = totalCantidad > 0 ? totalCosto / totalCantidad : 0;

    return {
      costoPromedio,
      totalCantidad
    };
  },

  create: async (data: ICreaterOrUdateLotesArticuloSucursal) => {
    const nuevoUUID = uuidv4();

    return await Lote_sucursal_articulo.create({
      id_lote_sucursal: nuevoUUID,
      ...data
    });
  },

  updateOrCreateLoteSucursal: async (
    data: ICreaterOrUdateLotesArticuloSucursal,
    options?: { transaction?: Transaction }
  ) => {
    const { id_artic, id_empre, numero_lote_sucursal } = data;

    const loteExistente = await Lote_sucursal_articulo.findOne({
      where: {
        id_artic,
        id_empre,
        numero_lote_sucursal
      },
      transaction: options?.transaction
    });

    if (loteExistente) {
      const nuevaCantidad = loteExistente.cantidad_lote_sucursal + data.cantidad_lote_sucursal;

      await loteExistente.update({
        cantidad_lote_sucursal: nuevaCantidad,
        precio_costo_lote_sucursal: data.precio_costo_lote_sucursal,
        fecha_venci_lote_sucursal: data.fecha_venci_lote_sucursal,
        estado_lote_sucursal: data.estado_lote_sucursal
      });

      return loteExistente;
    }

    const nuevoLote = await Lote_sucursal_articulo.create({
      ...data,
      id_lote_sucursal: uuidv4()
    });

    return nuevoLote;
  }
};
