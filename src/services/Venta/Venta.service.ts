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
import { MovimientoCajaRepository } from "../../repository/Caja/Movimiento_Caja.repository";
import CorteCaja from "../../models/Caja/Corte_Caja";
import LoteArticuloSucursal from "../../models/LotesYCaducidad/Lote_ArticuloSucursal";
import { EmpleadoService } from "../../modules/RRHH/services/Empleados.service";
import { Transaction } from "sequelize";
import { MovimientoCajaService } from "../Caja/Movimiento_Caja.service";
import { MonederoService } from "../Clientes/Monedero/Monedero.service";
import { MetodoPagoService } from "../Caja/Metodo_de_Pago.service";
import { IDetalleVentaInput } from "../../interface/Venta/Detalle_Venta.interface";

export type DetalleLookupInfo = {
  id_detalle_venta: string;
  id_articulo: string;
};

export type DetalleLookupMap = Map<string, DetalleLookupInfo>;

export const VentaService = {
  getAll: async () => {
    return await VentaRepository.getAll();
  },

  getResumenCorte: async (id_corte: string) => {
    return await VentaRepository.getResumenCorte(id_corte);
  },

  getById: async (id: string) => {
    const venta = await VentaRepository.getById(id);
    if (!venta) throw new Error("Venta no encontrada");
    return venta;
  },

  create: async (data: IVentaInput) => {
    const t = await dbLocal.transaction();
    try {

      const empleado = await EmpleadoService.obtenerEmpleado(data.id_empleado, t);
      const idEmpleadoUUID = empleado.id_empleado;

      const venta = await VentaRepository.create(
        {
          id_cliente: data.id_cliente ?? null,
          id_empleado: idEmpleadoUUID,
          id_caja: data.id_caja,
          id_corte: data.id_corte ?? null,
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

      const tempToDetalle: DetalleLookupMap = new Map();

      await procesarInventarioVenta(
        id_venta,
        data.detalle_venta,
        data.id_empre,
        t,
        tempToDetalle
      );

      await registrarPagosVenta(id_venta, data.venta_pago, t);

      const idMetodoMonedero = await MetodoPagoService.getIdByClave("MONEDERO", t);

      const pagoMonedero = data.venta_pago.find(
        (p) => p.id_metodo_pago === idMetodoMonedero
      );

      if (pagoMonedero && pagoMonedero.monto > 0 && venta.id_cliente) {
        await MonederoService.descontarSaldoPorVenta(
          venta.id_cliente,
          venta.id_empre,
          pagoMonedero.monto,
          t
        );
      }



      if (venta.status_venta === "CONFIRMADA") {
        for (const p of data.venta_pago) {
          await MovimientoCajaService.createMovimientoCaja(
            {
              id_caja: venta.id_caja,
              id_corte: venta.id_corte,
              tipo_movimiento: "INGRESO",
              concepto_movimiento: "VENTA",
              id_metodo_pago: p.id_metodo_pago,
              monto_movimiento: p.monto,
              referencia: `VENTA: ${venta.id_venta}`,
              id_empleado: idEmpleadoUUID,
            },
            { transaction: t }
          );
        }
      }

      if (venta.status_venta === "CONFIRMADA" && venta.id_cliente) {

        const idMetodoMonedero = await MetodoPagoService.getIdByClave("MONEDERO", t);

        const totalPagadoNoMonedero = data.venta_pago
          .filter(p => p.id_metodo_pago !== idMetodoMonedero)
          .reduce((sum, p) => sum + Number(p.monto), 0);

        const PORCENTAJE_CASHBACK = 0.03;
        const montoACumular = totalPagadoNoMonedero * PORCENTAJE_CASHBACK;

        if (montoACumular > 0) {
          await MonederoService.acumularSaldoPorVenta(
            venta.id_cliente,
            venta.id_empre,
            montoACumular,
            t
          );
        }
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

  cancelarVenta: async ({
    id_venta,
    motivo,
    id_empleado,
  }: {
    id_venta: string,
    motivo: string,
    id_empleado: string
  }) => {
    const t = await dbLocal.transaction();
    try {
      const venta = await VentaRepository.getVentaCompleta(id_venta, { transaction: t });

      if (!venta) {
        const err = new Error('Venta no encontrada');
        (err as any).status = 404;
        throw err;
      }

      if (venta.status_venta === 'CANCELADA') {
        const err = new Error('La venta ya está cancelada');
        (err as any).status = 400;
        throw err;
      }

      if (venta.id_corte) {
        const corte = await CorteCaja.findByPk(venta.id_corte);
        if (corte && corte.status_corte === false) {
          const err = new Error('No puedes cancelar una venta de un corte cerrado');
          (err as any).status = 409;
          throw err;
        }
      }

      for (const det of venta.detalle_venta) {
        for (const lu of det.lote_usado) {
          const lote = await LoteArticuloSucursal.findByPk(
            lu.id_lote_sucursal,
            { transaction: t, lock: t.LOCK.UPDATE }
          );

          if (!lote) {
            throw new Error(`Lote ${lu.id_lote_sucursal} no encontrado.`);
          }

          await lote.update(
            {
              cantidad_lote_sucursal:
                Number(lote.cantidad_lote_sucursal) + Number(lu.cantidad_utilizada),
            },
            { transaction: t }
          );

          await LoteUsadoVentaRepository.create(
            {
              id_detalle_venta: det.id_detalle_venta,
              id_lote_sucursal: lu.id_lote_sucursal,
              cantidad_utilizada: -Math.abs(lu.cantidad_utilizada),
            },
            { transaction: t }
          );
        }
      }

      if (venta.status_venta === 'CONFIRMADA') {
        for (const p of venta.venta_pago) {
          await MovimientoCajaService.createMovimientoCaja(
            {
              id_caja: venta.id_caja,
              id_corte: venta.id_corte,
              tipo_movimiento: "RETIRO",
              concepto_movimiento: "CANCELACION DE VENTA",
              id_metodo_pago: p.id_metodo_pago,
              monto_movimiento: p.monto,
              referencia: `CANCELACION VENTA: ${venta.id_venta}`,
              id_empleado,
            },
            { transaction: t }
          );

        }
      }

      await venta.update(
        {
          status_venta: 'CANCELADA',
          motivo_cancelacion: motivo,
          fecha_cancelacion: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      return { message: 'Venta cancelada exitosamente', venta };
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },


};


async function procesarInventarioVenta(
  id_venta: string,
  detalles: any[],
  id_empre: string,
  t: Transaction,
  tempToDetalle: Map<string, any>
) {
  for (const detalle of detalles) {

    const { lote_usado = [], temp_line_id, ...colsDetalle } = detalle;

    // const detalleVenta = await DetalleVentaRepository.create(
    //   { id_venta, ...detalle },
    //   { transaction: t }
    // );

    const columnasValidas: IDetalleVentaInput = {
      id_venta,
      id_artic: colsDetalle.id_artic,
      cantidad: colsDetalle.cantidad,
      precio_unitario: colsDetalle.precio_unitario,
      total_renglon:
        colsDetalle.total_renglon ??
        colsDetalle.total ??
        colsDetalle.cantidad * colsDetalle.precio_unitario,

      temp_line_id: temp_line_id ?? null,

      lote_usado: lote_usado ?? [],
    };


    const detalleVenta = await DetalleVentaRepository.create(
      columnasValidas,
      { transaction: t }
    );


    if (temp_line_id) {
      const id_articulo =
        (colsDetalle as any).id_artic ??
        (colsDetalle as any).id_articulo;

      if (!id_articulo) {
        throw new Error("Falta id_articulo en detalle_venta.");
      }

      tempToDetalle.set(String(temp_line_id), {
        id_detalle_venta: detalleVenta.id_detalle_venta,
        id_articulo,
      });
    }

    if (!lote_usado || lote_usado.length === 0) {
      throw new Error(
        `Faltan lotes usados para el artículo ${colsDetalle.id_artic}.`
      );
    }

    let acumulado = 0;

    for (const lu of lote_usado) {

      if (!lu.id_lote_sucursal)
        throw new Error("Falta id_lote_sucursal en lote_usado.");

      if (!lu.cantidad_utilizada || lu.cantidad_utilizada <= 0)
        throw new Error("cantidad_utilizada inválida.");

      const lote =
        await LotesArticuloSucursalRepository.findByPkInEmpresaArticulo(
          lu.id_lote_sucursal,
          id_empre,
          colsDetalle.id_artic,
          {
            transaction: t,
            lock: t.LOCK.UPDATE,
            skipLocked: false,
          }
        );

      if (!lote) {
        throw new Error("El lote no existe o no pertenece a esa empresa/artículo.");
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
          id_detalle_venta: detalleVenta.id_detalle_venta,
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
}

async function registrarPagosVenta(id_venta: string, pagos: any[], t: Transaction) {
  if (!pagos || pagos.length === 0) return;

  for (const p of pagos) {

    if (!p.id_metodo_pago) {
      throw new Error("Falta id_metodo_pago en un pago.");
    }

    if (p.monto == null || p.monto <= 0) {
      throw new Error("Monto del pago inválido.");
    }

    await VentaPagoRepository.create(
      {
        id_venta,
        id_metodo_pago: p.id_metodo_pago,
        monto: p.monto,
      },
      { transaction: t }
    );
  }
}



