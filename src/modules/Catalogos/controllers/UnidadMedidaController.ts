import type { Request, Response } from 'express';
import { UnidadMedidaService } from '../services/unidadMedida.service';

export class UnidadMedidaController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const todasLasUnidades = await UnidadMedidaService.getAllUnidadMedida();
      res.status(200).json({ mensaje: todasLasUnidades });
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error al obtener todas las unidades.' });
    }
  };
  static getPrueba = async (req: Request, res: Response) => {
    try {
      const todasLasUnidades = await UnidadMedidaService.getAllUnidadMedidaPrueba();
      res.status(200).json(todasLasUnidades);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener todas las unidades.' });
    }
  };
  static getByID = async (req: Request, res: Response) => {
    try {
      const { id_medida } = req.params;
      const medida = await UnidadMedidaService.getByID(Number(id_medida));
      res.status(200).json(medida);
    } catch (error) {
      // console.error( error);
      res.status(500).json({ mensaje: 'Error al encontrar la unidad de medida.' });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const newUnidadMedida = await UnidadMedidaService.createUnidadMedida(data);
      res.status(201).json({ mensaje: 'Unidad de medida creada correctamente.', UnidadMedida: newUnidadMedida });
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error al crear la unidad de medida.' });
    }
  };

  static actualizarByID = async (req: Request, res: Response) => {
    try {
      const { id_medida } = req.params;
      const data = req.body;
      const updateMedida = await UnidadMedidaService.updateByID(Number(id_medida), data);
      res.status(200).json({ mensaje: 'Unidad de medida actualizada correctamente.', unidadMedida: updateMedida });
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error al actualizar la unidad de medida.' });
    }
  };
}
