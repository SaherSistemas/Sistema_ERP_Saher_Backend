import type { Request, Response } from "express";
import { Asignacion_Empleado_SucursalService } from "../../services/Presupuestos/Asignacion_Empleado_Sucursal.service";

export class Asignacion_Empleado_SucursalController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const result = await Asignacion_Empleado_SucursalService.getAll();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;

      if (
        !data.id_empleado ||
        !data.id_empre ||
        !data.fecha_inicio ||
        !data.tipo
      ) {
        res.status(400).json({
          error:
            "Campos obligatorios faltantes: id_empleado, id_empre, fecha_inicio, tipo",
        });
      }

      const result = await Asignacion_Empleado_SucursalService.create(data);

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        error: error.message || "Error al crear la asignación del empleado",
      });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = await Asignacion_Empleado_SucursalService.getByID(id);
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!id) {
        res
          .status(400)
          .json({ error: "Falta el ID del presupuesto empleado." });
      }

      const result = await Asignacion_Empleado_SucursalService.update(id, data);

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
}
