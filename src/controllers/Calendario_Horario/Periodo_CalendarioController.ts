import type { Request, Response } from "express";
import { Periodo_CalendarioService } from "../../services/Calendario_Horario/Periodo_Calendario.service";

export class Periodo_CalendarioController {

  static duplicarPeriodo = async (req: Request, res: Response) => {
    try {
      const { id_periodo } = req.params;
      const data = req.body;
        const nuevoPeriodo = await Periodo_CalendarioService.duplicarPeriodo(id_periodo, data);
        res.status(201).json(nuevoPeriodo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al duplicar el periodo." });
    }
  };

  static cerrarPeriodo = async (req: Request, res: Response) => {
    try {
      const { id_periodo } = req.params;
      const periodo = await Periodo_CalendarioService.cerrarPeriodo(id_periodo);
      res.status(200).json(periodo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al cerrar el periodo." });
    }
  };

  static activarPeriodo = async (req: Request, res: Response) => {
    try {
      const { id_periodo } = req.params;
      const periodo = await Periodo_CalendarioService.activarPeriodo(
        id_periodo
      );
      res.status(200).json(periodo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al activar el periodo." });
    }
  };

  static getAll = async (req: Request, res: Response) => {
    try {
      const periodos = await Periodo_CalendarioService.getAll();
      res.status(200).json(periodos);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar todos los periodos." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id_periodo } = req.params;
      const periodo = await Periodo_CalendarioService.getById(id_periodo);
      res.status(200).json(periodo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar el periodo." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoPeriodo = await Periodo_CalendarioService.create(data);
      res.status(201).json(nuevoPeriodo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear el periodo." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id_periodo } = req.params;
      const data = req.body;
      const periodoActualizado = await Periodo_CalendarioService.update(
        id_periodo,
        data
      );
      res.status(200).json(periodoActualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar el periodo." });
    }
  };

  static delete = async (req: Request, res: Response) => {
    try {
      const { id_periodo } = req.params;
      await Periodo_CalendarioService.delete(id_periodo);
      res.status(200).json({ mensaje: "Periodo eliminado correctamente." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al eliminar el periodo." });
    }
  };
}
