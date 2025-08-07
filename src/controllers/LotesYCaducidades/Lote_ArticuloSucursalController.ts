import type { Request, Response } from "express";
import { LotesArticuloSucursalService } from "../../services/LoteYCaducidades/Lote_ArticuloSucursal.service";

export class LotesArticuloSucursalController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const cajas = await LotesArticuloSucursalService.getAll();
      res.status(200).json(cajas);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({
          mensaje: "Error al encontrar todas los Lotes Articulo sucursal.",
        });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const caja = await LotesArticuloSucursalService.getById(id);
      res.status(200).json(caja);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar Lotes Articulo sucursal." });
    }
  };
  static getLotesPorCodigoBarra = async (req: Request, res: Response) => {
    try {
      const { cod_barr_artic } = req.params;
      const lotes = await LotesArticuloSucursalService.getLotesPorCodigoBarra(
        cod_barr_artic
      );
      res.status(200).json({
        cantidad: lotes,
      });
    } catch (error) {
      console.error("Error en getLotesPorCodigoBarra:", error);
      res
        .status(500)
        .json({ mensaje: "Error al obtener la cantidad de lotes por codigo." });
    }
  };
  static repartirCantidadEntreLotes = async (req: Request, res: Response) => {
    try {
      const { cod_barr_artic } = req.params;
      const cantidadSolicitada = Number(req.query.cantidad); // o puede ser req.body.cantidad, según cómo quieras

      if (
        !cod_barr_artic ||
        isNaN(cantidadSolicitada) ||
        cantidadSolicitada <= 0
      ) {
        res.status(400).json({ mensaje: "Parámetros inválidos" });
      }

      const lotesParaVenta =
        await LotesArticuloSucursalService.repartirCantidadEntreLotes(
          cod_barr_artic,
          cantidadSolicitada
        );

      res.status(200).json(lotesParaVenta);
    } catch (error: any) {
      console.error("Error en repartirCantidadEntreLotes:", error.message);
      res.status(500).json({ mensaje: error.message });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoLote = await LotesArticuloSucursalService.create(data);
      res.status(201).json(nuevoLote);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al crear Lotes Articulo sucursal." });
    }
  };
  /*
    static updateByID = async (req: Request, res: Response) => {
      try {
        const { id_lote_sucursal } = req.params;
        const data = req.body;
        const updateLote = await LotesArticuloSucursalService.update(
          id_lote_sucursal,
          data
        );
        res
          .status(201)
          .json({
            mensaje: "Lotes Articulo sucursal actualizado correctamente.",
            id_lote_sucursal: updateLote,
          });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ mensaje: "Error al actualizar Lotes Articulo sucursal." });
      }
    };*/
}
