import type { Request, Response } from "express";
import { Asignacion_Empleado_SucursalService } from "../../services/Presupuestos/Asignacion_Empleado_Sucursal.service";

export class Asignacion_Empleado_SucursalController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const result = await Asignacion_Empleado_SucursalService.getAll();
      res.status(200).json(result);
    } catch (error: any) {
      console.error("[Asignacion_Empleado_SucursalController.getAll]", error);
      res.status(500).json({ error: error.message || "Error al obtener asignaciones" });
    }
  };

  static getEmpleadosSinAsignacionEmpresa = async (req: Request, res: Response) => {
    try {
      const { id_empre } = req.params;
      const data = await Asignacion_Empleado_SucursalService.getEmpleadosSinAsignacionEmpresa(id_empre);
      res.status(200).json(data);
    } catch (error) {
      console.error("[Asignacion_Empleado_SucursalController.getEmpleadosSinAsignacionEmpresa]", error);
      res.status(500).json({
        error: error.message || "Error al obtener empleados sin asignación.",
      });
    }
  };

  static getResumenPorEmpleado = async (req: Request, res: Response) => {
    try {
      const result = await Asignacion_Empleado_SucursalService.getResumenPorEmpleado();
      res.status(200).json(result);
    } catch (error) {
      console.error("[Asignacion_Empleado_SucursalController.getResumenPorEmpleado]", error);
      res.status(500).json({
        error: error.message || "Error al obtener el resumen de asignaciones por empleado",
      });
    }
  };

  static getAllByEmpleado = async (req: Request, res: Response) => {
    try {
      const { id_empleado } = req.params;
      const result = await Asignacion_Empleado_SucursalService.getAllByEmpleado(id_empleado);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };



  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;

      // Validación de campos obligatorios
      if (!data.id_empleado || !data.id_empre || !data.fecha_inicio || !data.tipo) {
        res.status(400).json({
          error: "Campos obligatorios faltantes: id_empleado, id_empre, fecha_inicio, tipo",
        });
      }

      // Crear asignación
      const result = await Asignacion_Empleado_SucursalService.create(data);

      // Respuesta exitosa
      res.status(201).json(result);

    } catch (error: any) {
      console.error("[Asignacion_Empleado_SucursalController.create]", error);

      // Respuesta de error controlada
      res.status(400).json({
        error: error.message || "Error al crear la asignación del empleado",
      });
    }
  };



  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "Falta el parámetro ID." });
      }

      const data = await Asignacion_Empleado_SucursalService.getByID(id);
      res.status(200).json(data);
    } catch (error: any) {
      console.error("[Asignacion_Empleado_SucursalController.getByID]", error);
      res.status(404).json({ error: error.message || "Asignación no encontrada" });
    }
  };


  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!id) {
        res.status(400).json({ error: "Falta el ID de la asignación." });
      }

      const result = await Asignacion_Empleado_SucursalService.update(id, data);

      res.status(200).json({
        mensaje: "Asignación actualizada correctamente",
        data: result,
      });
    } catch (error: any) {
      console.error("[Asignacion_Empleado_SucursalController.update]", error);
      res.status(400).json({
        error: error.message || "Error al actualizar la asignación del empleado",
      });
    }
  };
}
