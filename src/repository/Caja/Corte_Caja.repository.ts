import CorteCaja from "../../models/Caja/Corte_Caja";
import { isUUID } from "../../utils/validaciones";
import {
  ICreateOrUpdateCorteCaja,
} from "../../interface/Caja/Corte_Caja.interface";
import { v4 as uuidv4 } from "uuid";
import Venta from "../../models/Venta/Venta";
import Venta_Pago from "../../models/Venta/Venta_Pago";
import { Transaction } from "sequelize";
import { dbLocal } from "../../config/db";
import Metodo_de_Pago from "../../models/Caja/Metodo_de_Pago";
import Movimiento_Caja from "../../models/Caja/Movimiento_Caja";

export const CorteCajaRepository = {
  getAll: async () => {
    return await CorteCaja.findAll();
  },

  getCorteAbiertoByCaja: async (id_caja: string) => {
    return await CorteCaja.findOne({
      where: {
        id_caja,
        status_corte: true
      }
    });
  },

  getByIDFlexible: async (id_corte: string) => {
    if (isUUID(id_corte)) {
      return await CorteCaja.findByPk(id_corte);
    } else {
      return await CorteCaja.findOne({
        where: { id_caja: id_corte },
      });
    }
  },

  getCantidadCortesPorCaja: async (id_caja: string) => {
    return await CorteCaja.count({
      where: { id_caja },
    });
  },

  createCorteCaja: async (
    id_caja: string,
    id_usuario_apertura: string,
    monto_inicial: number,
    options?: { transaction?: Transaction }

  ) => {
    return await CorteCaja.create({
      id_corte: uuidv4(),
      fecha_apertura: new Date(),
      status_corte: true,
      id_caja: id_caja,
      id_usuario_apertura: id_usuario_apertura,
      monto_inicial: monto_inicial,
    });
  },

  updateCierreCorteCaja: async (
    id_corte: string,
    data: ICreateOrUpdateCorteCaja
  ) => {
    if (!id_corte) throw new Error("id_corte es undefined");

    const dataActualizada = {
      ...data,
      fecha_cierre: new Date(),
      status_corte: false,
    };

    return await CorteCaja.update(dataActualizada, {
      where: { id_corte },
    });
  },

  updateCorteCaja: async (
    id_caja: string,
    id_usuario_cierre: string,
    monto_declarado: number
  ) => {
    const t = await dbLocal.transaction();

    try {
      const corte = await CorteCaja.findOne({
        where: { id_caja, status_corte: true },
        transaction: t
      });

      if (!corte) {
        throw new Error("No hay un corte abierto para esta caja.");
      }

      const pagos = await Venta_Pago.findAll({
        where: {
          "$venta.id_corte$": corte.id_corte
        },
        include: [
          {
            model: Venta,
            attributes: []
          },
          {
            model: Metodo_de_Pago,
            attributes: ["nombre_metodo_pago"]
          }
        ],
        transaction: t
      });

      const totalVentasCaja = pagos
        .filter(p =>
          p.metodo_pago?.nombre_metodo_pago === "EFECTIVO" ||
          p.metodo_pago?.nombre_metodo_pago === "VALE"
        )
        .reduce((acc, p) => acc + Number(p.monto), 0);

      const movimientos = await Movimiento_Caja.findAll({
        where: { id_corte: corte.id_corte },
        transaction: t
      });

      let totalMovimientos = 0;
      for (const mv of movimientos) {
        if (mv.tipo_movimiento === "ENTRADA") {
          totalMovimientos += Number(mv.monto_movimiento);
        } else if (mv.tipo_movimiento === "SALIDA") {
          totalMovimientos -= Number(mv.monto_movimiento);
        }
      }

      const montoFinal =
        Number(corte.monto_inicial) +
        totalVentasCaja +
        totalMovimientos;

      corte.id_usuario_cierre = id_usuario_cierre;
      corte.monto_declarado = monto_declarado;
      corte.total_venta = totalVentasCaja;
      // corte.total_movimientos = totalMovimientos;
      corte.monto_final = montoFinal;
      corte.fecha_cierre = new Date();
      corte.status_corte = false;

      await corte.save({ transaction: t });
      await t.commit();

      return corte;

    } catch (e) {
      await t.rollback();
      throw e;
    }
  },



};
