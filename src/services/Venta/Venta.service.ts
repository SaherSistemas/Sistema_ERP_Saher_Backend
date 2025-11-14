import {
  ICreateOrUpdateVenta,
  IVentaInput,
} from "../../interface/Venta/Venta.interface";
import { VentaRepository } from "../../repository/Venta/Venta.repository";
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository";
import { dbLocal } from "../../config/db";
import { VentaPagoRepository } from "../../repository/Venta/Venta_Pago.repository";
import { LoteUsadoVentaRepository } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository";
import { LotesArticuloSucursalRepository } from "../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository";
import { RecetaMedicaService } from "../RecetaMedica/RecetaMedica.service";
import Empleado from "../../models/Usuarios/Empleado/Empleado";

export type DetalleLookupInfo = {
  id_detalle_venta: string;
  id_articulo: string;
};

export type DetalleLookupMap = Map<string, DetalleLookupInfo>;

export const VentaService = {
  getAll: async (id_caja: string) => {
    return await VentaRepository.getAll(id_caja);
  },

  getById: async (id: string) => {
    const venta = await VentaRepository.getById(id);
    if (!venta) throw new Error("Venta no encontrada");
    return venta;
  },

  create: async (data: IVentaInput) => {
    const t = await dbLocal.transaction();
    try {
      // --- Resolver empleado flexible ---
      let idEmpleadoUUID: string | null = null;

      if (data.id_empleado) {
        if (data.id_empleado.includes("-")) {
          idEmpleadoUUID = data.id_empleado;
        } else {
          const empleado = await Empleado.findOne({
            where: { idinterno_empleado: Number(data.id_empleado) },
            attributes: ["id_empleado"],
          });

          if (!empleado) {
            const err = new Error(`Empleado no encontrado`);
            (err as any).status = 404; // marcar el tipo de error
            throw err;
          }

          idEmpleadoUUID = empleado.id_empleado;
        }
      } else {
        const err = new Error("id_empleado no enviado en la venta.");
        (err as any).status = 400;
        throw err;
      }

      console.log("UUID del empleado resuelto:", idEmpleadoUUID);

      // --- Crear la venta principal ---
      const venta = await VentaRepository.create(
        {
          id_cliente: data.id_cliente ?? null,
          id_empleado: idEmpleadoUUID,
          id_caja: data.id_caja,
          id_empre: data.id_empre,
          total_venta: data.total_venta,
          tipo_venta: data.tipo_venta,
          status_venta: data.status_venta,
          detalle_venta: [],
          venta_pago: [],
        },
        { transaction: t }
      );

      const id_venta = venta.id_venta;

      const ctx = {
        id_empre: data.id_empre,
        id_cliente: data.id_cliente ?? null,
        fecha: new Date(),
        // canal: data.canal ?? "PDV",
      };

      const tempToDetalle: DetalleLookupMap = new Map();

      for (const detalle of data.detalle_venta) {
        const { lote_usado = [], temp_line_id, ...colsDetalle } = detalle;

        const detalle_venta = await DetalleVentaRepository.create(
          { id_venta, ...detalle },
          { transaction: t }
        );

        if (temp_line_id) {
          const id_articulo =
            (colsDetalle as any).id_artic ?? (colsDetalle as any).id_articulo;
          if (!id_articulo)
            throw new Error("Falta id_articulo en detalle_venta.");

          tempToDetalle.set(String(temp_line_id), {
            id_detalle_venta: detalle_venta.id_detalle_venta,
            id_articulo,
          });
        }
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
          const lote =
            await LotesArticuloSucursalRepository.findByPkInEmpresaArticulo(
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

      const recetaPayload = (data as any).recetaPayload;
      const debeCrearReceta =
        venta.status_venta === "CONFIRMADA" &&
        recetaPayload &&
        recetaPayload.receta &&
        Array.isArray(recetaPayload.articulos) &&
        recetaPayload.articulos.length > 0;

      if (debeCrearReceta) {
        await RecetaMedicaService.createFromVenta(
          {
            id_venta,
            recetaPayload: (data as any).recetaPayload,
            tempToDetalle,
          },
          { transaction: t }
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
