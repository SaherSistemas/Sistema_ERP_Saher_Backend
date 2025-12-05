import type { Request, Response } from "express";
import { CorteCajaService } from "../../services/Caja/Corte_Caja.service";

export class CorteCajaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const cortes = await CorteCajaService.getAll();
      res.status(200).json(cortes);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar todos los cortes de caja." });
    }
  };

  static getAllByCaja = async (req: Request, res: Response) => {
    try {
      const { id_caja } = req.params;

      const cortes = await CorteCajaService.getAllByCaja(id_caja);

      res.status(200).json(cortes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error obteniendo los cortes de la caja." });
    }
  };


  static getTotalCaja = async (req: Request, res: Response) => {
    try {
      const { id_corte } = req.params;

      if (!id_corte) {
        res.status(400).json({ mensaje: "id_corte es requerido." });
      }

      const total = await CorteCajaService.calcularTotalCaja(id_corte);

      res.status(200).json({ total });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        mensaje: "Error al obtener el total de la caja",
        error: error.message,
      });
    }
  };


  static getByID = async (req: Request, res: Response) => {
    try {
      const { id_corte } = req.params;
      const corte = await CorteCajaService.getByIDFlexible(id_corte);
      res.status(200).json(corte);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar el corte de caja." });
    }
  };

  static getCantidadCortesPorCaja = async (req: Request, res: Response) => {
    try {
      const { id_caja } = req.params;
      const cantidadCortes = await CorteCajaService.getCantidadCortesPorCaja(
        id_caja
      );
      res.status(200).json({ cantidad: cantidadCortes });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al obtener la cantidad de cortes de caja." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const { id_caja } = req.params;
      const { id_usuario_apertura, monto_inicial } = req.body;
      const nuevoCorte = await CorteCajaService.createCorteCaja({
        id_caja,
        id_usuario_apertura,
        monto_inicial
      }
      );
      res.status(200).json(nuevoCorte);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear el corte de caja." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id_caja } = req.params;
      const { id_usuario_cierre, monto_declarado } = req.body;
      const corteActualizado = await CorteCajaService.updateCorteCaja(
        id_caja,
        id_usuario_cierre,
        monto_declarado
      );
      res.status(200).json(corteActualizado);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al actualizar el corte de caja." });
    }
  };
}
