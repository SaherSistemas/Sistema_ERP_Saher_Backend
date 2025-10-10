import type { Request, Response } from "express";
import { Asignacion_TurnoService } from "../../services/Calendario_Horario/Asignacion_Turno.service";

export class Asignacion_TurnoController {
//   static TurnosAsignadosEmpleado = async (req: Request, res: Response) => {
//     const { id_empleado } = req.params;
//     const { desde, hasta } = req.query;
//     try {
//       const turnos = await Asignacion_TurnoService.TurnosAsignadosEmpleado(
//         id_empleado,
//         desde as string,
//         hasta as string
//       );
//       res.json(turnos);
//     } catch (error) {
//       console.error(error);
//       res
//         .status(500)
//         .json({ mensaje: "Error al obtener los turnos asignados." });
//     }
//   };


 static TurnosAsignadosEmpleado = async (req: Request, res: Response) => {
    const { id_empleado } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    if (!id_empleado || !fecha_inicio || !fecha_fin) {
      res
        .status(400)
        .json({ mensaje: "Faltan parámetros obligatorios (id_empleado, fecha_inicio, fecha_fin)." });
      return;
    }

    try {
     const turnos = await Asignacion_TurnoService.TurnosAsignadosEmpleado(
        id_empleado,
        fecha_inicio as string,
        fecha_fin as string
      );

      if (!turnos || turnos.length === 0) {
        res.status(200).json({
          mensaje: "No se encontraron turnos asignados en el rango.",
          data: [],
        });
      }
      res.status(200).json({ data: turnos });

    } catch (error: any) {
      console.error("Error en TurnosAsignadosEmpleado:", error.message);

      if (error.message.includes("Faltan") || error.message.includes("inicio")) {
       res.status(400).json({ mensaje: error.message });
      }
       res
        .status(500)
        .json({ mensaje: "Error al obtener los turnos asignados." });
    }
  };

  static getByTurno = async (req: Request, res: Response) => {
    try {
      const { id_turno } = req.params;
      const asignacion = await Asignacion_TurnoService.getById(id_turno);
      if (!asignacion) {
        res.status(200).json({ message: "Turno Vacante" });
        return;
      }
      res.status(200).json(asignacion);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al obtener la asignación." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    const { id_asignacion } = req.params;
    try {
      const asignacion = await Asignacion_TurnoService.getById(id_asignacion);
      if (!asignacion) {
        res.status(404).json({ message: "Asignación no encontrada" });
      }
      res.json(asignacion);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener la asignación", error });
    }
  };

  static getAll = async (req: Request, res: Response) => {
    try {
      const asignaciones = await Asignacion_TurnoService.getAll();
      res.json(asignaciones);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener las asignaciones", error });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevaAsignacion = await Asignacion_TurnoService.create(data);
      res.status(201).json(nuevaAsignacion);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear la asignación." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id_asignacion } = req.params;
      const data = req.body;
      const asignacionActualizada = await Asignacion_TurnoService.update(
        id_asignacion,
        data
      );
      res.status(200).json(asignacionActualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar la asignación." });
    }
  };

  static delete = async (req: Request, res: Response) => {
    try {
      const { id_asignacion } = req.params;
      await Asignacion_TurnoService.delete(id_asignacion);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al eliminar la asignación." });
    }
  };
}
