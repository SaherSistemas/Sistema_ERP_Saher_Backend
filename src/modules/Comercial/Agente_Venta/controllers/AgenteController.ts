import type { Request, Response } from 'express';
import { AgenteService } from '../services/Agente.service';
import { IAgenteDeVentaCreate } from '../interface/Agente.interface';

export class AgenteController {
  static getAllAgentes = async (req: Request, res: Response) => {
    try {
      const agentes = await AgenteService.getAllAgentes();
      //console.log(empleados)
      res.status(201).json(agentes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener todos los empleados' });
    }
  };
  static createAgente = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoAgente = await AgenteService.createAgente(data);
      res.status(201).json({ mensaje: 'Agente creado correctamente.', agente: nuevoAgente });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al crear el agente' });
    }
  };
  static getAgenteByID = async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;
      const agente = await AgenteService.getAgenteByID(id_agente);
      res.status(201).json(agente);
    } catch (error) {
      // console.error(error);
      res.status(500).json({ message: 'No se encontro el agente' });
    }
  };
  static updateAgente = async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;
      const data: IAgenteDeVentaCreate = req.body;
      const updateAgente = await AgenteService.updateAgente(id_agente, data);
      res.status(201).json({ mensaje: 'Agente actualizado correctamente', agente: updateAgente });
    } catch (error) {
      //console.error(error)
      console.error(error);
      res.status(500).json({ message: 'Error al actualizar el agente ' });
    }
  };
}
