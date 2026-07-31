import {
  ICreateOrUpdateVenta,
  IVentaInput,
} from "../../interface/Venta/Venta.interface";
import { VentaRepository } from "../../repository/Venta/Venta.repository";
import { DetalleVentaRepository } from "../../repository/Venta/Detalle_Venta.repository";
import { dbLocal } from "../../config/db";
import { RetoService } from "../../modules/Gamificacion/service/Reto.service";
import Articulo from "../../modules/Catalogos/Articulos/model/Articulo";
import { VentaPagoRepository } from "../../repository/Venta/Venta_Pago.repository";
import { LoteUsadoVentaRepository } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository";
import { RecetaMedicaService } from "../RecetaMedica/RecetaMedica.service";
import { MovimientoCajaRepository } from "../../repository/Caja/Movimiento_Caja.repository";
import CorteCaja from "../../models/Caja/Corte_Caja";
import Caja from "../../models/Caja/Caja";
import { CorteCajaService } from "../Caja/Corte_Caja.service";
import LoteArticuloSucursal from "../../modules/Inventario/Lotes/model/Lote_Articulo_Sucursal";
import Stock_Ubicacion_Lote from "../../modules/Inventario/Stock/model/Stock_Ubicacion_Lote";
import { EmpleadoService } from "../../modules/RRHH/services/Empleados.service";
import { Transaction } from "sequelize";
import { MovimientoCajaService } from "../Caja/Movimiento_Caja.service";
import { MonederoService } from "../Clientes/Monedero/Monedero.service";
import { MetodoPagoService } from "../Caja/Metodo_de_Pago.service";
import { IDetalleVentaInput } from "../../interface/Venta/Detalle_Venta.interface";
import { UsoOfertaRepository } from "../../repository/Ofertas/UsoOferta.repository";
import {
  fetchIVAMap,
  fetchOfertaMap,
  desglosarIVA,
  calcDescuentoRenglon,
} from "../../utils/checkout.utils";

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
          subtotal: data.subtotal ?? null,
          iva_total: data.iva_total ?? null,
          descuento_total: data.descuento_total ?? null,
          cambio: data.cambio ?? null,
          tipo_venta: data.tipo_venta,
          status_venta: data.status_venta,
          detalle_venta: [],
          venta_pago: [],
        },
        { transaction: t }
      );

      const id_venta = venta.id_venta;

      const tempToDetalle: DetalleLookupMap = new Map();

      const totalesCheckout = await procesarInventarioVenta(
        id_venta,
        data.detalle_venta,
        data.id_empre,
        t,
        tempToDetalle
      );

      // Actualizar header de venta con totales calculados
      await venta.update(
        {
          subtotal: totalesCheckout.subtotal,
          iva_total: totalesCheckout.iva_total,
          descuento_total: totalesCheckout.descuento_total,
        },
        { transaction: t }
      );

      // Registrar uso de ofertas (solo si hay cliente)
      if (venta.id_cliente && totalesCheckout.ofertasAplicadas.length > 0) {
        const ofertasUnicas = [
          ...new Map(
            totalesCheckout.ofertasAplicadas.map((o) => [o.id_oferta, o])
          ).values(),
        ];
        for (const uso of ofertasUnicas) {
          await UsoOfertaRepository.create(
            { id_oferta: uso.id_oferta, id_cliente: venta.id_cliente, id_venta },
            { transaction: t }
          );
        }
      }

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

      // Retiro automático si se supera el límite de caja
      let retiroAutomatico: { monto: number; limite: number } | null = null;
      if (venta.status_venta === 'CONFIRMADA' && data.id_corte) {
        try {
          const caja = await Caja.findByPk(venta.id_caja);
          if (caja && caja.monto_limite_retiro != null) {
            const saldo = await CorteCajaService.calcularTotalCaja(data.id_corte!);
            if (saldo > Number(caja.monto_limite_retiro)) {
              const corte = await CorteCaja.findByPk(data.id_corte);
              if (corte) {
                const montoRetiro = saldo - Number(corte.monto_inicial);
                if (montoRetiro > 0) {
                  const idEfectivo = await MetodoPagoService.getIdByClave('EFECTIVO');
                  await MovimientoCajaService.createMovimientoCaja({
                    id_caja: venta.id_caja,
                    id_corte: data.id_corte!,
                    tipo_movimiento: 'RETIRO',
                    concepto_movimiento: 'RETIRO PARCIAL',
                    id_metodo_pago: idEfectivo,
                    monto_movimiento: montoRetiro,
                    referencia: `RETIRO AUTOMÁTICO — límite $${Number(caja.monto_limite_retiro).toFixed(2)}`,
                    id_empleado: corte.id_usuario_apertura,
                  });
                  retiroAutomatico = { monto: montoRetiro, limite: Number(caja.monto_limite_retiro) };
                }
              }
            }
          }
        } catch (err) {
          console.error('[AutoRetiro] Error en retiro automático:', err);
        }
      }

      // Actualizar progreso de retos (fire-and-forget, no bloquea la respuesta)
      if (venta.status_venta === 'CONFIRMADA' && data.id_empleado && data.id_corte) {
        setImmediate(async () => {
          try {
            const arts = await Articulo.findAll({
              where: { id_artic: data.detalle_venta.map((d: any) => d.id_artic) },
              attributes: ['id_artic', 'id_categoria'],
            });
            const catMap = new Map(arts.map(a => [a.id_artic, a.id_categoria]));
            await RetoService.actualizarProgresoVenta({
              id_empleado: idEmpleadoUUID,
              id_empresa: data.id_empre,
              id_corte: data.id_corte,
              fecha_dia: new Date().toISOString().slice(0, 10),
              total_venta: data.total_venta,
              num_ventas_incremento: 1,
              detalles: data.detalle_venta.map((d: any) => ({
                id_artic: d.id_artic,
                id_categoria: catMap.get(d.id_artic) ?? undefined,
                cantidad: d.cantidad,
                precio_unitario: Number(d.precio_unitario),
              })),
            });
          } catch (err) {
            console.error('[Retos] Error actualizando progreso:', err);
          }
        });
      }

      return { message: "Venta creada exitosamente", venta: ventaCompleta, retiro_automatico: retiroAutomatico };
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
        const corte = await CorteCaja.findByPk(venta.id_corte, { transaction: t });
        if (corte && corte.status_corte === false) {
          const err = new Error('No puedes cancelar una venta de un corte cerrado');
          (err as any).status = 409;
          throw err;
        }
      }

      for (const det of venta.detalle_venta) {
        for (const lu of det.lote_usado) {
          // Devolver stock a stock_ubicacion_lote (primer registro disponible del lote)
          const stockRows = await Stock_Ubicacion_Lote.findAll({
            where: { id_lote: lu.id_lote_sucursal },
            order: [['cantidad', 'ASC']],
            transaction: t,
            lock: t.LOCK.UPDATE,
          });

          if (stockRows.length > 0) {
            // Suma de vuelta al primer registro encontrado
            const row = stockRows[0];
            await row.update(
              { cantidad: Number(row.cantidad) + Number(lu.cantidad_utilizada) },
              { transaction: t }
            );
          }

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


type TotalesCheckout = {
  subtotal: number;
  iva_total: number;
  descuento_total: number;
  ofertasAplicadas: Array<{ id_oferta: string; id_venta: string }>;
};

async function procesarInventarioVenta(
  id_venta: string,
  detalles: any[],
  id_empre: string,
  t: Transaction,
  tempToDetalle: Map<string, any>
): Promise<TotalesCheckout> {
  const idsArticulos = detalles.map((d) => d.id_artic as string);

  // Fetch IVA y ofertas en paralelo (una query cada uno, fuera del loop)
  const [ivaMap, ofertaMap] = await Promise.all([
    fetchIVAMap(idsArticulos),
    fetchOfertaMap(idsArticulos, id_empre),
  ]);

  let subtotal = 0;
  let iva_total = 0;
  let descuento_total = 0;
  const ofertasAplicadas: Array<{ id_oferta: string; id_venta: string }> = [];

  for (const detalle of detalles) {
    const { lote_usado = [], temp_line_id, ...colsDetalle } = detalle;

    const cantidad = Number(colsDetalle.cantidad);
    const precioOriginal = Number(colsDetalle.precio_unitario);

    // Aplicar oferta si existe
    const oferta = ofertaMap.get(colsDetalle.id_artic) ?? null;
    let descuento = 0;
    let precioConDescuento = precioOriginal;

    if (oferta) {
      const res = calcDescuentoRenglon(precioOriginal, cantidad, oferta);
      precioConDescuento = res.precioConDescuento;
      descuento = res.descuento;
    }

    const total_renglon = +(precioConDescuento * cantidad - (oferta?.tipo_beneficio === "BOGO" ? descuento : 0)).toFixed(2);
    // Para PORCENTAJE/MONTO_FIJO el descuento ya está en precioConDescuento
    const totalRenglonFinal = oferta?.tipo_beneficio === "BOGO"
      ? +(precioOriginal * cantidad - descuento).toFixed(2)
      : +(precioConDescuento * cantidad).toFixed(2);

    // Desglosar IVA (precios incluyen IVA)
    const iva = ivaMap.get(colsDetalle.id_artic) ?? { porcentaje: 0, tipo_factor: "Exento" as const };
    const { subtotal_renglon, iva_renglon } = desglosarIVA(
      oferta ? precioConDescuento : precioOriginal,
      cantidad,
      iva
    );

    // Acumular totales del header
    subtotal += subtotal_renglon;
    iva_total += iva_renglon;
    descuento_total += descuento;

    const columnasValidas: IDetalleVentaInput = {
      id_venta,
      id_artic: colsDetalle.id_artic,
      cantidad,
      precio_unitario: precioOriginal,
      precio_original: precioOriginal,
      descuento_articulo: descuento,
      iva_renglon,
      total_renglon: totalRenglonFinal,
      temp_line_id: temp_line_id ?? null,
      lote_usado: lote_usado ?? [],
    };

    const detalleVenta = await DetalleVentaRepository.create(
      columnasValidas,
      { transaction: t }
    );

    if (oferta) {
      ofertasAplicadas.push({ id_oferta: oferta.id_oferta, id_venta });
    }

    if (temp_line_id) {
      const id_articulo = colsDetalle.id_artic ?? colsDetalle.id_articulo;
      if (!id_articulo) throw new Error("Falta id_articulo en detalle_venta.");
      tempToDetalle.set(String(temp_line_id), {
        id_detalle_venta: detalleVenta.id_detalle_venta,
        id_articulo,
      });
    }

    if (!lote_usado || lote_usado.length === 0) {
      throw new Error(`Faltan lotes usados para el artículo ${colsDetalle.id_artic}.`);
    }

    let acumulado = 0;

    for (const lu of lote_usado) {
      if (!lu.id_lote_sucursal)
        throw new Error("Falta id_lote_sucursal en lote_usado.");
      if (!lu.cantidad_utilizada || lu.cantidad_utilizada <= 0)
        throw new Error("cantidad_utilizada inválida.");

      let restante = Number(lu.cantidad_utilizada);

      let stockRows = await Stock_Ubicacion_Lote.findAll({
        where: { id_lote: lu.id_lote_sucursal },
        order: [["cantidad", "ASC"]],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      // Lotes migrados o sin ubicación asignada: crear fila de stock on-the-fly
      if (!stockRows.length) {
        const lote = await LoteArticuloSucursal.findByPk(lu.id_lote_sucursal, { transaction: t });
        if (!lote) throw new Error(`Lote ${lu.id_lote_sucursal} no encontrado.`);
        const nuevaFila = await Stock_Ubicacion_Lote.create(
          {
            id_articulo: lote.id_artic,
            id_empresa_sucursal: lote.id_empre,
            id_lote: lote.id_lote_sucursal,
            id_ubicacion_sucursal: null,
            cantidad: lote.cantidad_entrada_lote,
            cantidad_apartada: 0,
          },
          { transaction: t }
        );
        stockRows = [nuevaFila];
      }

      const totalDisponible = stockRows.reduce((s, r) => s + Number(r.cantidad), 0);
      if (totalDisponible < lu.cantidad_utilizada) {
        throw new Error(`Stock insuficiente en ubicación para el lote ${lu.id_lote_sucursal}.`);
      }

      for (const row of stockRows) {
        if (restante <= 0) break;
        const tomar = Math.min(Number(row.cantidad), restante);
        await row.update({ cantidad: Number(row.cantidad) - tomar }, { transaction: t });
        restante -= tomar;
      }

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

    if (acumulado !== cantidad) {
      throw new Error(
        `La suma de lotes usados (${acumulado}) no coincide con la cantidad vendida (${cantidad}).`
      );
    }
  }

  return {
    subtotal: +subtotal.toFixed(2),
    iva_total: +iva_total.toFixed(2),
    descuento_total: +descuento_total.toFixed(2),
    ofertasAplicadas,
  };
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



