import type { Request, Response } from "express";
import { Presupuesto_EmpleadoService } from "../../services/Presupuestos/Presupuesto_Empleado.service";

export class Presupuesto_EmpleadoController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const result = await Presupuesto_EmpleadoService.getAll();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await Presupuesto_EmpleadoService.create(data);
      res
        .status(201)
        .json({
          mensaje: "Presupuesto de empleado creado correctamente",
          data: result,
        });
    } catch (error) {
      res
        .status(500)
        .json({ mensaje: "Error al crear el presupuesto de empleado." });
    }
  };


  static async getEmpleadosNoAsignados(req: Request, res: Response) {
    const { id_empre, id_presupuesto } = req.params;
    try {
      const empleados = await Presupuesto_EmpleadoService.getEmpleadosNoAsignados(
        id_empre, 
        id_presupuesto
      );
      res.status(200).json(empleados);
    } catch (error) {
      console.error("Error al obtener empleados no asignados:", error);
      res.status(500).json({ message: "Error interno al obtener empleados no asignados." });
    }
  }


  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!id) {
        res
          .status(400)
          .json({ error: "Falta el ID del presupuesto empleado." });
      }

      const result = await Presupuesto_EmpleadoService.update(id, data);

      res.status(200).json({
        mensaje: "Presupuesto de empleado actualizado correctamente",
        data: result,
      });
    } catch (error) {
      console.error("[Presupuesto_EmpleadoController.update]", error);
      res
        .status(500)
        .json({ error: error.message || "Error interno del servidor" });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = await Presupuesto_EmpleadoService.getByID(id);
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static getByPresupuesto = async (req: Request, res: Response) => {
    try {
      const { id_presupuesto } = req.params;
      const result = await Presupuesto_EmpleadoService.getByPresupuesto(
        id_presupuesto
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("[Presupuesto_EmpleadoController.getByPresupuesto]", error);
      res
        .status(500)
        .json({ error: error.message || "Error interno del servidor" });
    }
  };

  static delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await Presupuesto_EmpleadoService.delete(id);

      res.status(200).json({
        mensaje: "Presupuesto de empleado eliminado correctamente",
        data: result,
      });
    } catch (error) {
      console.error("[Presupuesto_EmpleadoController.delete]", error);
      res
        .status(500)
        .json({
          error: error.message || "Error al eliminar el presupuesto empleado",
        });
    }
  };
}
