import Lote_sucursal_articulo from "../../models/LotesYCaducidad/Lote_ArticuloSucursal";
import {
  ILotesArticuloSucursal,
  ICreaterOrUdateLotesArticuloSucursal,
} from "../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface";

import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from "uuid";
import { ArticuloRepository } from "../Articulos/Articulo.repository";
import { Op, Sequelize, Transaction, FindOptions } from "sequelize";
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
      attributes: ["id_lote_sucursal"],
      raw: true,
    });
  },

  getById: async (id: string) => {
    if (isUUID(id)) {
      return await Lote_sucursal_articulo.findByPk(id);
    }
  },

  listByEmpresaArticulo: async (
    id_empre: string,
    id_artic: string,
    options: RepoOpts = {}
  ) => {
    return await Lote_sucursal_articulo.findAll({
      where: { id_empre, id_artic },
      ...options,
    });
  },

  getLotesPorCodigoBarra: async (cod_barr_artic: string, id_empre:string) => {
    const articulo = await ArticuloRepository.getByIDFlexible(cod_barr_artic);
    if (!articulo) throw new Error("Artículo no encontrado");

    const id_artic = articulo.id_artic;

    return Lote_sucursal_articulo.findAll({
      where: {
        id_empre,
        id_artic,
        cantidad_lote_sucursal: { [Op.gt]: 0 },
      },
      attributes: [
        "id_lote_sucursal",  
        "fecha_venci_lote_sucursal",
        "numero_lote_sucursal",
        "cantidad_lote_sucursal",
      ],
      order: [["fecha_venci_lote_sucursal", "ASC"]],
      limit:1
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
        id_artic,
      },
      ...options,
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
          cantidad_lote_sucursal: Sequelize.literal(
            `cantidad_lote_sucursal - ${lote.cantidad_lote_sucursal}`
          ),
        },
        {
          where: {
            numero_lote_sucursal: lote.numero_lote_sucursal,
            cantidad_lote_sucursal: { [Op.gte]: lote.cantidad_lote_sucursal },
          },
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
      attributes: ["cantidad_lote_sucursal", "precio_costo_lote_sucursal"],
      where: {
        id_artic,
        id_empre: ids_Empresas,
        cantidad_lote_sucursal: { [Op.gt]: 0 },
      },
      raw: true,
      transaction: options?.transaction,
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
      totalCantidad,
    };
  },

  create: async (data: ICreaterOrUdateLotesArticuloSucursal) => {
    const nuevoUUID = uuidv4();

    return await Lote_sucursal_articulo.create({
      id_lote_sucursal: nuevoUUID,
      ...data,
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
        numero_lote_sucursal,
      },
      transaction: options?.transaction,
    });

    if (loteExistente) {
      const nuevaCantidad =
        loteExistente.cantidad_lote_sucursal + data.cantidad_lote_sucursal;

      await loteExistente.update({
        cantidad_lote_sucursal: nuevaCantidad,
        precio_costo_lote_sucursal: data.precio_costo_lote_sucursal,
        fecha_venci_lote_sucursal: data.fecha_venci_lote_sucursal,
        estado_lote_sucursal: data.estado_lote_sucursal,
      });

      return loteExistente;
    }

    const nuevoLote = await Lote_sucursal_articulo.create({
      ...data,
      id_lote_sucursal: uuidv4(),
    });

    return nuevoLote;
  },
};
