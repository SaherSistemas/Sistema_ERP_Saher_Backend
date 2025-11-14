import { UUID } from "crypto";
import CorteCaja from "../../models/Caja/Corte_Caja";
import { isUUID } from "../../utils/validaciones";
import {
  ICorteCaja,
  ICreateOrUpdateCorteCaja,
} from "../../interface/Caja/Corte_Caja.interface";
import { v4 as uuidv4 } from "uuid";
import Venta from "../../models/Venta/Venta";

export const CorteCajaRepository = {
  getAll: async () => {
    return await CorteCaja.findAll();
  },

  getByIDFlexible: async (id_corte: string) => {
    //     const include = [
    //     { model: Empleado, as: 'empleado_apertura', attributes: ['id_empleado', 'nombre_empleado'] },
    //     { model: Empleado, as: 'empleado_cierre', attributes: ['id_empleado', 'nombre_empleado'] },
    // ];
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
    monto_inicial: number
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
    const corte = await CorteCaja.findOne({
      where: { id_caja, status_corte: true },
    });

    if (!corte) {
      throw new Error("No hay un corte abierto para esta caja.");
    }

    const totalVentas = await Venta.sum("total", {
      where: { id_corte: corte.id_corte },
    });

    const montoFinal = Number(corte.monto_inicial) + Number(totalVentas || 0);

    corte.id_usuario_cierre = id_usuario_cierre;
    corte.monto_declarado = monto_declarado;
    corte.total_venta = totalVentas || 0;
    corte.monto_final = montoFinal;
    corte.fecha_cierre = new Date();
    corte.status_corte = false;

    await corte.save();
    return corte;
  },
};
