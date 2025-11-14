import { dbLocal } from "../../config/db";
import {
  IDetalleVenta,
  ICreateOrUpdateDetalleVenta,
  IDetalleVentaInput,
} from "../../interface/Venta/Detalle_Venta.interface";
import { LoteUsadoVentaRepository } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository";
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository";
import { v4 as uuidv4 } from "uuid";

export const DetalleVentaService = {
  getAll: async () => {
    return await DetalleVentaRepository.getAll();
  },
  getById: async (id: string) => {
    const loteartic = await DetalleVentaRepository.getById(id);
    if (!loteartic) throw new Error("Lote Articulo Sucursal no enocontrado");
    return loteartic;
  },

  create: async (data: IDetalleVentaInput) => {
    const t = await dbLocal.transaction();
    try {
      const detalle_venta = await DetalleVentaRepository.create(
        {
          id_venta: data.id_venta,
          id_artic: data.id_artic,
          cantidad: data.cantidad,
          precio_unitario: data.precio_unitario,
          total_renglon: data.total_renglon,
          lote_usado: data.lote_usado,
        },
        { transaction: t }
      );

      const id_detalle_venta = detalle_venta.id_detalle_venta;

      for (const lote_usado of data.lote_usado) {
        await LoteUsadoVentaRepository.create(
          {
            id_detalle_venta,
            ...lote_usado,
          },
          { transaction: t }
        );
      }

      await t.commit();
      return await DetalleVentaRepository.getById(id_detalle_venta);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
    const detalle = await DetalleVentaRepository.getById(id);
    if (!detalle) return null;
    await detalle.update(data);
    return detalle;
  },
};
