import type { Request, Response } from "express";
import { VentaService } from "../../services/Venta/Venta.service";
import Venta from "../../models/Venta/Venta";

export class VentaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const ventas = await VentaService.getAll();
      res.status(200).json(ventas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar todas las Ventas." });
    }
  };

  static getResumenCorte = async (req: Request, res: Response) => {
    try {
      const { id_corte } = req.params;
      const resumen = await VentaService.getResumenCorte(id_corte);
      console.log("Conexión usada para Venta:", Venta.sequelize?.config?.database);

      res.status(200).json(resumen);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        mensaje: "Error al obtener el resumen del corte."
      });
    }
  };

  static cancelar = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id_empleado, motivo } = req.body;

      if (!id_empleado) {
        res.status(400).json({
          mensaje: "id_empleado es requerido para cancelar la venta."
        });
      }

      if (!motivo || motivo.trim() === "") {
        res.status(400).json({
          mensaje: "Debes enviar un motivo de cancelación."
        });
      }

      const result = await VentaService.cancelarVenta({
        id_venta: id,
        motivo,
        id_empleado
      });

      res.status(200).json({
        mensaje: "Venta cancelada exitosamente.",
        venta: result
      });

    } catch (error: any) {
      console.error("Error cancelando venta:", error);

      res.status(error.status || 500).json({
        mensaje: error.message || "Error al cancelar la venta."
      });
    }
  };


  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const venta = await VentaService.getById(id);
      res.status(200).json(venta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar la Venta." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await VentaService.create(data);
      res.status(201).json(result);
    } catch (e: any) {
      console.error("Error al crear venta:", e);

      if (e.status === 404) {
        res
          .status(404)
          .json({ message: e.message || "Empleado no encontrado" });
      }

      if (e.status === 400) {
        res.status(400).json({ message: e.message || "Datos inválidos" });
      }

      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const actualizado = await VentaService.update(id, data);
      res.status(200).json(actualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar la Venta." });
    }
  };
}
