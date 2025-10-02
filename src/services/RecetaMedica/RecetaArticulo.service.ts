import { dbLocal } from "../../config/db";
import { RecetaArticuloRepository } from "../../repository/RecetaMedica/RecetaArticulo.repository";
import { Transaction } from "sequelize";



export type AgregarArticulosArgs = {
  id_receta: string;
  
  recetaArticulos: Array<{
    id_detalle_venta: string;
    indicaciones?: string | null;
    cantidad_prescrita?: number | null;
    dosis?: string | null;
    sustitucion_permitida?: boolean;
    id_articulo: string;
  }>;
};

type Options = { transaction?: Transaction };
export const RecetaArticuloService = {

  getAll: async () => {
    return await RecetaArticuloRepository.getAll();
  },
  agregarArticulosAReceta: async (
    args: AgregarArticulosArgs,
    options?: Options
  ) => {
    const run = async (t: Transaction) => {
      // --- Validaciones básicas y útiles ---
      if (!args?.id_receta) throw new Error("Falta id_receta.");
      if (!Array.isArray(args?.recetaArticulos) || args.recetaArticulos.length === 0) {
        throw new Error("Debes enviar al menos un artículo de receta.");
      }

      for (const [i, r] of args.recetaArticulos.entries()) {
        if (!r?.id_detalle_venta) {
          throw new Error(`Falta id_detalle_venta en recetaArticulos[${i}].`);
        }
        if (r.cantidad_prescrita != null && r.cantidad_prescrita < 0) {
          throw new Error(`cantidad_prescrita inválida en recetaArticulos[${i}].`);
        }
      }

      await RecetaArticuloRepository.agregarArticulosAReceta(t, args);

      // Puedes retornar algo útil; por simplicidad devuelvo un resumen
      return {
        ok: true,
        id_receta: args.id_receta,
        insertados: args.recetaArticulos.length,
      };
    };

    if (options?.transaction) return run(options.transaction);
    return dbLocal.transaction(run);
  },
};

