import { v4 as uuidv4 } from "uuid";
import RecetaArticulo from "../../models/RecetaMedica/Receta_Articulo";
import Receta_Articulo from "../../models/RecetaMedica/Receta_Articulo";
import { Transaction } from "sequelize";

type AttachRow = {
  id_detalle_venta: string;
  id_articulo: string;                       
  indicaciones?: string | null;
  cantidad_prescrita?: number | null;
  dosis?: string | null;
  sustitucion_permitida?: boolean | null;
};

export const RecetaArticuloRepository = {
  getAll: async () => {
    return await RecetaArticulo.findAll();
  },

  agregarArticulosAReceta: async (
    t: Transaction,
    args: {
      id_receta: string;
      recetaArticulos: AttachRow[];
     }
  ) => {
    if (!args.recetaArticulos.length) return;

    await Receta_Articulo.bulkCreate(
      args.recetaArticulos.map((r) => ({
        id_receta: args.id_receta,
        id_detalle_venta: r.id_detalle_venta,
        id_articulo: r.id_articulo,
        indicaciones: r.indicaciones ?? null,
        cantidad_prescrita: r.cantidad_prescrita ?? null,
        dosis: r.dosis ?? null, 
        sustitucion_permitida: r.sustitucion_permitida ?? null,
      })),
      { transaction: t }
    );
  },
};
