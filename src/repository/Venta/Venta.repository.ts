import Venta from "../../models/Venta/Venta";
import DetalleVenta from "../../models/Venta/Detalle_Venta";
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import { Transaction } from "sequelize"; 
import {
  IVenta,
  ICreateOrUpdateVenta,
  IVentaInput,
} from "../../interface/Venta/Venta.interface";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from "uuid";
import { DetalleVentaRepository } from "./Detalle_Venta.repository";

const ventaIncludes = [
  {
    model: DetalleVenta,
    include: [
      {
        model: LoteUsadoVenta,
        as: 'lote_usado',
      },
    ],
  },
];

export const VentaRepository = {
  getAll: async () => {
    return await Venta.findAll({ include: ventaIncludes });
  },

  getById: async (id_venta: string) => {
    if (!isUUID(id_venta)) return null;
    return await Venta.findByPk(id_venta, { include: ventaIncludes });
  },

  create: async (data: Partial<ICreateOrUpdateVenta>, options?: { transaction?: Transaction }) => {
  return await Venta.create(data, options);
},


  update: async (id_venta: string, data: Partial<ICreateOrUpdateVenta>) => {
    const venta = await Venta.findByPk(id_venta);
    if (!venta) return null;
    return await venta.update(data);
  },

  // delete: async (id_venta: string) => {
  //   const venta = await Venta.findByPk(id_venta);
  //   if (!venta) return null;
  //   await venta.destroy();
  //   return true;
  // },
};