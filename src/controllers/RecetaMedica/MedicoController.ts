import type { Request, Response } from "express";
import { MedicoService } from "../../services/RecetaMedica/Medico.service";

export class MedicoController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const medico = await MedicoService.getAll();
      res.status(200).json(medico);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar medico." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { identificador_medico } = req.params;
      const medico = await MedicoService.getByIDFlexible(
        identificador_medico
      );
      res.status(200).json(medico);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar Medicos." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevomedico = await MedicoService.create(data);
      res.status(201).json(nuevomedico);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear medico." });
    }
  };
  
  static BuscarMedicoCedula = async (req: Request, res: Response) => {
    try {
      const { cedula_medico } = req.params;
      const medico = await MedicoService.BuscarMedicoCedula(cedula_medico);
      res.status(200).json(medico);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar Medico." });
    }
  }
}
