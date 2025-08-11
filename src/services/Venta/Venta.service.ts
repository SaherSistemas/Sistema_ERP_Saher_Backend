import { Sequelize } from "sequelize-typescript";
import {
  ICreateOrUpdateVenta,
  IVenta,
  IVentaInput,
} from "../../interface/Venta/Venta.interface";
import { VentaRepository } from "../../repository/Venta/Venta.repository";
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository";
import { v4 as uuidv4 } from "uuid";
import { dbLocal } from "../../config/db";
import { LoteUsadoVentaRepository } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository";

export const VentaService = {
  getAll: async () => {
    return await VentaRepository.getAll();
  },

  getById: async (id: string) => {
    const venta = await VentaRepository.getById(id);
    if (!venta) throw new Error("Venta no encontrada");
    return venta;
  },

  create: async (data: IVentaInput) => {
    const transaction = await dbLocal.transaction();
    try {
      const id_venta = uuidv4();

      await VentaRepository.create(
        {
          id_venta,
          id_cliente: data.id_cliente,
          id_empleado: data.id_empleado,
          id_empre: data.id_empre,
          tipo_venta: data.tipo_venta,
          id_metodo_pago: data.id_metodo_pago,
          status_venta: data.status_venta,
        },
        { transaction }
      );

      for (const detalle of data.detalle_venta) {
        const detalle_venta = await DetalleVentaRepository.create(
          {
            ...detalle,
            id_venta,
            id_detalle_venta: uuidv4(),
          },
          { transaction }
        );
      
      for (const lote_usado of detalle.lote_usado) {
        const id_detalle_venta = uuidv4();

        await LoteUsadoVentaRepository.create(
          {
            id_lote_usado: uuidv4(),
            id_detalle_venta: detalle_venta.id_detalle_venta,
            id_lote_sucursal: lote_usado.id_lote_sucursal,
            cantidad_utilizada: lote_usado.cantidad_utilizada,
          },
          { transaction }
        );
      }
    }

      await transaction.commit();

      return await VentaRepository.getById(id_venta);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  update: async (id: string, data: Partial<ICreateOrUpdateVenta>) => {
    const detalle = await VentaRepository.getById(id);
    if (!detalle) return null;
    await detalle.update(data);
    return detalle;
  },
};
