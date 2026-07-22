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
import Caja from "../../models/Caja/Caja";

export const CorteCajaRepository = {
  getAll: async () => {
    return await CorteCaja.findAll();
  },

  getAllByCaja: async (id_caja: string) => {
    return await CorteCaja.findAll({
      where: { id_caja },
      include: [
        {
          model: Caja,
          attributes: ["nombre_caja", "id_empre"],
        },
      ],
      order: [["fecha_cierre", "DESC"]],
    });
  },


  getCorteAbiertoByCaja: async (id_caja: string) => {
    return await CorteCaja.findOne({
      where: {
        id_caja,
        status_corte: true
      }
    });
  },

  getCortesAbiertosporEmpresa: async (id_empre: string) => {
    return await CorteCaja.findAll({
      where: { status_corte: true },
      include: [{
        model: Caja,
        attributes: ['nombre_caja', 'id_empre'],
        where: { id_empre, activa: true },
        required: true,
      }],
      order: [['fecha_apertura', 'DESC']],
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

      // Solo ventas CONFIRMADAS en efectivo/vale del corte
      const pagos = await Venta_Pago.findAll({
        where: { "$venta.id_corte$": corte.id_corte, "$venta.status_venta$": "CONFIRMADA" },
        include: [
          { model: Venta, attributes: [] },
          { model: Metodo_de_Pago, attributes: ["nombre_metodo_pago"] },
        ],
        transaction: t,
      });

      const totalVentasCaja = pagos
        .filter(p =>
          p.metodo_pago?.nombre_metodo_pago === "EFECTIVO" ||
          p.metodo_pago?.nombre_metodo_pago === "VALE"
        )
        .reduce((acc, p) => acc + Number(p.monto), 0);

      // Movimientos manuales: depósitos, retiros parciales, ajustes
      // Excluimos los automáticos de ventas (ya en totalVentasCaja) y el fondo inicial (en monto_inicial)
      const conceptosAutomaticos = new Set([
        "VENTA",
        "CANCELACION DE VENTA",
        "FONDO INICIAL",
        "APERTURA DE CAJA",
        "CIERRE DE CAJA",
      ]);

      const movimientos = await Movimiento_Caja.findAll({
        where: { id_corte: corte.id_corte },
        transaction: t,
      });

      // monto_movimiento ya está normalizado: positivo=ingreso, negativo=retiro
      const totalMovimientos = movimientos
        .filter(mv => !conceptosAutomaticos.has(mv.concepto_movimiento))
        .reduce((acc, mv) => acc + Number(mv.monto_movimiento), 0);

      const montoFinal =
        Number(corte.monto_inicial) +
        totalVentasCaja +
        totalMovimientos;

      corte.id_usuario_cierre = id_usuario_cierre;
      corte.monto_declarado = monto_declarado;
      corte.total_venta = totalVentasCaja;
      corte.total_movimientos = totalMovimientos;
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
