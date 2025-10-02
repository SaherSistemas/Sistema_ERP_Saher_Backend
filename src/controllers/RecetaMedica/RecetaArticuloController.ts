import { Request, Response, NextFunction } from "express";
import { RecetaArticuloService } from "../../services/RecetaMedica/RecetaArticulo.service";


export class RecetaArticuloController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const recetaArt = await RecetaArticuloService.getAll();
            res.status(200).json(recetaArt);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar Receta Articulo." });
        }
    }

    static agregarArticulosAReceta = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id_receta = String(req.params.id_receta ?? "");
      const recetaArticulos = Array.isArray(req.body?.recetaArticulos)
        ? req.body.recetaArticulos
        : [];

      const result = await RecetaArticuloService.agregarArticulosAReceta({
        id_receta,
        recetaArticulos,
      });

      res.status(201).json(result);
    } catch (err: any) {
      const msg = err?.message || "Error al agregar artículos a la receta";
      if (/Falta id_receta|Debes enviar al menos un artículo|Falta id_detalle_venta|inválida/.test(msg)) {
      res.status(400).json({ ok: false, error: msg });
      }
      next(err); 
     }
    }
};