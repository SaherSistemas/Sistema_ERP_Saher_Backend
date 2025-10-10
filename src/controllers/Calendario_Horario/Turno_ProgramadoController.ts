import type { Request, Response } from "express";
import { Turno_ProgramadoRepository } from "../../repository/Calendario_Horario/Turno_Programado.repository";

export class Turno_ProgramadoController {
  static getTurnosPorPeriodo = async (req: Request, res: Response) => {
    const { id_periodo } = req.params;
    try {
      const resultado =
        await Turno_ProgramadoRepository.getTurnosPorPeriodo(id_periodo);
      res.status(200).json(resultado);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }
  
  
  static getAll = async (req: Request, res: Response) => {
    try {
      const turnos = await Turno_ProgramadoRepository.getAll();
      res.status(200).json(turnos);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

  static getById = async (req: Request, res: Response) => {
    const { id_turno } = req.params;
    try {
      const turno = await Turno_ProgramadoRepository.getById(id_turno);
      if (!turno) {
       res.status(404).json({ message: "Turno no encontrado" });
      } else {
        res.status(200).json(turno);
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const nuevoTurno = await Turno_ProgramadoRepository.create(req.body);
      res.status(201).json(nuevoTurno);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

  static update = async (req: Request, res: Response) => {
    const { id_turno } = req.params;
    try {
      const turnoActualizado = await Turno_ProgramadoRepository.update(
        id_turno,
        req.body
      );
      res.status(200).json(turnoActualizado);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

  static delete = async (req: Request, res: Response) => {
    const { id_turno } = req.params;
    try {
      await Turno_ProgramadoRepository.delete(id_turno);
      res.status(200).json({ message: "Turno eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };
}
