import Venta from "../../models/Venta/Venta";
import DetalleVenta from "../../models/Venta/Detalle_Venta";
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import { Transaction } from "sequelize";
import { dbLocal } from "../../config/db";

import { ICreateOrUpdateVenta, IVentaInput } from "../../interface/Venta/Venta.interface";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from "uuid";
import { DetalleVentaRepository } from "./Detalle_Venta.repository";
import Metodo_de_Pago from "../../models/Caja/Metodo_de_Pago";
import Venta_Pago from "../../models/Venta/Venta_Pago";
import sequelize from "sequelize/lib/sequelize";
import { RecetaMedicaService } from "../../services/RecetaMedica/RecetaMedica.service";
import Medico from "../../models/RecetaMedica/Medico";
import RecetaMedica from "../../models/RecetaMedica/RecetaMedica";
import Receta_Articulo from "../../models/RecetaMedica/Receta_Articulo";
import { RecetaMedicaRepository } from "../RecetaMedica/RecetaMedica.repository";
import { DetalleLookupMap } from "../../services/Venta/Venta.service";

const ventaIncludes = [
  {
    model: DetalleVenta,
    as: "detalle_venta",
    include: [{ model: LoteUsadoVenta, as: "lote_usado" }],
  },
  {
    model: Venta_Pago,
    as: "venta_pago",
    attributes: ["id_metodo_pago", "monto"],
    include: [
      {
        model: Metodo_de_Pago,
        as: "metodo_pago",
        attributes: ["nombre_metodo_pago"],
      },
    ],
  },
];

export const VentaRepository = {
  getAll: async () => {
    return await Venta.findAll({ include: ventaIncludes });
  },

  getById: async (id_venta: string, options?: { transaction?: Transaction }) => {
    if (!isUUID(id_venta)) return null;
    return Venta.findByPk(id_venta, {
      include: ventaIncludes,
      transaction: options?.transaction,
    });
  },

  create: async (input: IVentaInput, options?: { transaction?: Transaction }) => {
    const run = async (t: Transaction) => {
      const {
        detalle_venta = [],
        venta_pago = [],
        recetaPayload,
        ...ventaData
      } = input as any;
      if (ventaData.id_venta == null) delete (ventaData as any).id_venta;

      // crear venta
      const id_venta = uuidv4();
      const venta = await Venta.create({ ...ventaData, id_venta }, { transaction: t });

      // crear detalle
      let createdDetalleModels: DetalleVenta[] = [];
      if (detalle_venta.length) {
        const payloadDetalles = detalle_venta.map((d: any) => ({
          id_venta,
          id_artic: d.id_artic,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          temp_line_id: d.temp_line_id ?? null
        }));

        createdDetalleModels = await DetalleVenta.bulkCreate(payloadDetalles, {
          transaction: t,
          returning: true,
        });
      }

      const tempMap: DetalleLookupMap = new Map();

      for (const d of createdDetalleModels) {
        const temp = (d as any).temp_line_id as string | null;
        if (!temp) continue;

        const id_articulo = (d as any).id_artic ?? (d as any).id_articulo;

        if (!id_articulo) throw new Error("Falta id_articulo en detalle_venta.");

        tempMap.set(temp, {
          id_detalle_venta: d.id_detalle_venta,
          id_articulo,
        });
      }

      if (venta_pago.length) {
        const payloadPagos = venta_pago.map((p: any) => ({
          id_venta,
          id_metodo_pago: p.id_metodo_pago,
          monto: p.monto,
        }));
        await Venta_Pago.bulkCreate(payloadPagos, { transaction: t });
      }


      const debeCrearReceta =
        venta.status_venta === "CONFIRMADA" &&
        recetaPayload &&
        recetaPayload.receta &&
        Array.isArray(recetaPayload.articulos) &&
        recetaPayload.articulos.length > 0;

      if (debeCrearReceta) {
        await RecetaMedicaService.createFromVenta({

          id_venta,
          recetaPayload,
          tempToDetalle: tempMap,
        }, { transaction: t });
      }

      await venta.reload({ include: ventaIncludes, transaction: t });
      return venta;
    };

    if (options?.transaction) {
      return run(options.transaction);
    }
    return dbLocal.transaction(run);
  },

  update: async (id_venta: string, data: Partial<ICreateOrUpdateVenta>) => {
    const venta = await Venta.findByPk(id_venta);
    if (!venta) return null;
    return venta.update(data);
  },
};
