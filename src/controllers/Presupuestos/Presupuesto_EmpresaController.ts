import { Presupuesto_EmpresaService } from "../../services/Presupuestos/Presupuesto_Empresa.service";
import type { Request, Response } from "express";

export class Presupuesto_EmpresaController {
  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await Presupuesto_EmpresaService.create(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await Presupuesto_EmpresaService.updatePresupuesto(id, data);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static getAll = async (req: Request, res: Response) => {
    try {
      const result = await Presupuesto_EmpresaService.getAll();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await Presupuesto_EmpresaService.getPresupuestoById(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static buscarPorFecha = async (req: Request, res: Response) => {
    try {
      const { anio, mes } = req.query;

      const result = await Presupuesto_EmpresaService.buscarPorFecha({
        anio: anio ? Number(anio) : undefined,
        mes: mes ? Number(mes) : undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static getByEmpresa = async (req: Request, res: Response) => {
    try {
      const { id_empre } = req.params;
      const result = await Presupuesto_EmpresaService.getPresupuestosEmpresa(
        id_empre
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static cerrarPresupuesto = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await Presupuesto_EmpresaService.cerrarPresupuesto(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static getVigentes = async (req: Request, res: Response) => {
    const { id_empre } = req.params;
    try {

    const presupuestos = await Presupuesto_EmpresaService.getPresupuestosVigentes(id_empre);
    res.status(200).json(presupuestos);
  } catch (error) {
     res.status(500).json({ message: "Error al obtener presupuestos vigentes." });
  }
};

}
