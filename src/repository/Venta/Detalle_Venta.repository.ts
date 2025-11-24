import DetalleVenta from "../../models/Venta/Detalle_Venta";
import {
  ICreateOrUpdateDetalleVenta,
  IDetalleVenta,
  IDetalleVentaInput,
} from "../../interface/Venta/Detalle_Venta.interface";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from "uuid";
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import Articulo from "../../models/Articulos/Articulo";
import { CreateOptions, Transaction } from "sequelize";

export const DetalleVentaRepository = {
  getAll: async () => {
    return await DetalleVenta.findAll({
      include: [
        { model: LoteUsadoVenta },
        { model: Articulo, attributes: ["des_artic"] },
      ],
    });
  },

  

  getById: async (id_detalle_venta: string) => {
    if (isUUID(id_detalle_venta)) {
      return await DetalleVenta.findByPk(id_detalle_venta, {
        include: [
          { model: LoteUsadoVenta },
          { model: Articulo, attributes: ["des_artic"] },
        ],
      });
    }
  },

  create: async (data: IDetalleVentaInput, options?: CreateOptions) => {
    return await DetalleVenta.create(
      {
        id_detalle_venta: uuidv4(),
        ...data,
      },
      options
    );
  },

  update: async (id: string, data: Partial<ICreateOrUpdateDetalleVenta>) => {
    if (!isUUID(id)) return null;

    const detalle = await DetalleVenta.findByPk(id);
    if (!detalle) return null;

    await detalle.update(data);
    return detalle;
  },
};
