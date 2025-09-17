import {
  ICreateOrUpdateVenta,
  IVentaInput,
} from "../../interface/Venta/Venta.interface";
import { VentaRepository } from "../../repository/Venta/Venta.repository";
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository";
import { v4 as uuidv4 } from "uuid";
import { dbLocal } from "../../config/db";
// import { LoteUsadoVentaRepository } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository";
import { VentaPagoRepository } from "../../repository/Venta/Venta_Pago.repository";
import { LoteUsadoVentaRepository } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository";
import { LotesArticuloSucursalRepository } from "../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository";
import { UsoOfertaRepository } from "../../repository/Ofertas/UsoOferta.repository";
import { OfertaRepository } from "../../repository/Ofertas/Ofertas.repository";
import { OfertaService } from "../Ofertas/Ofertas.service";

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
    const t = await dbLocal.transaction();
    try {
      const venta = await VentaRepository.create(
        {
          id_cliente: data.id_cliente,
          id_empleado: data.id_empleado,
          id_empre: data.id_empre,
          tipo_venta: data.tipo_venta,
          status_venta: data.status_venta,
          detalle_venta: [],
          venta_pago: [],
        },
        { transaction: t }
      );

      const id_venta = venta.id_venta;

         // Calcula pricing de ofertas
        const ctx = {
        id_empre: data.id_empre,
        id_cliente: data.id_cliente ?? null,
        fecha: new Date(),
        // canal: data.canal ?? "PDV",
      };
      

      for (const detalle of data.detalle_venta) {
        const { lote_usado = [], ...colsDetalle } = detalle;

        const detalle_venta = await DetalleVentaRepository.create(
          { id_venta, ...detalle },
          { transaction: t }
        );

        if (lote_usado.length === 0) {
          throw new Error(
            `Faltan lotes usados para el artículo ${colsDetalle.id_artic}.`
          );
        }
        let acumulado = 0;

       

        for (const lu of lote_usado) {
          if (!lu.id_lote_sucursal)
            throw new Error("Falta id_lote_sucursal en lote_usado.");
          if (lu.cantidad_utilizada == null || lu.cantidad_utilizada <= 0)
            throw new Error(
              "cantidad_utilizada inválida en uno de los lotes usados."
            );
          const lote = await LotesArticuloSucursalRepository.findByPkInEmpresaArticulo(
              lu.id_lote_sucursal,
              data.id_empre,
              colsDetalle.id_artic,
              { transaction: t, lock: t.LOCK.UPDATE, skipLocked: false }
            );
          if (!lote) {
            throw new Error(
              "El lote no existe o no pertenece a esa empresa/artículo."
            );
          }

        const stock = Number(lote.cantidad_lote_sucursal);
          if (stock < lu.cantidad_utilizada) {
            throw new Error(
              `Stock insuficiente en el lote ${lote.numero_lote_sucursal}.`
            );
          }
          await lote.update(
            { cantidad_lote_sucursal: stock - lu.cantidad_utilizada },
            { transaction: t }
          );

          await LoteUsadoVentaRepository.create(
            {
              id_detalle_venta: detalle_venta.id_detalle_venta,
              id_lote_sucursal: lu.id_lote_sucursal,
              cantidad_utilizada: lu.cantidad_utilizada,
            },
            { transaction: t }
          );
          acumulado += lu.cantidad_utilizada;
        }
        if (acumulado !== colsDetalle.cantidad) {
          throw new Error(
            `La suma de lotes usados (${acumulado}) no coincide con la cantidad vendida (${colsDetalle.cantidad}).`
          );
        }
        // const ofertas = await OfertaRepository.getOfertas(
        //   {
        //     id_artic: colsDetalle.id_artic,
        //     id_empre: data.id_empre,
        //     fecha: new Date(),
        //   },
        //   { transaction: t }
        // );
        // for (const ofe of ofertas) {
        //   await UsoOfertaRepository.create(
        //     {
        //       id_venta,
        //       id_oferta: ofe.id_oferta,
        //       id_cliente: data.id_cliente ?? null,
        //     },
        //     { transaction: t }
        //   );
        // }

      }

      for (const p of data.venta_pago) {
        await VentaPagoRepository.create(
          {
            id_venta,
            id_metodo_pago: p.id_metodo_pago,
            monto: p.monto,
          },
          {
            transaction: t,
          }
        );
      }

      const ventaCompleta = await VentaRepository.getById(id_venta, {
        transaction: t,
      });

      await t.commit();
      return { message: "Venta creada exitosamente", venta: ventaCompleta };
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },

  update: async (id: string, data: Partial<ICreateOrUpdateVenta>) => {
    const detalle = await VentaRepository.getById(id);
    if (!detalle) return null;
    await detalle.update(data);
    return detalle;
  },
};
