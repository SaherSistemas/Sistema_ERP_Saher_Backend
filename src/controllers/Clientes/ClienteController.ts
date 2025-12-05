import type { Request, Response } from 'express';
import { ClienteService } from '../../services/Clientes/cliente.service';

export class ClienteController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const clientes = await ClienteService.getAll();
      res.status(200).json(clientes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar todos los clientes.' });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { identificador_cliente } = req.params;

      //console.log(identificador_cliente);
      const cliente = await ClienteService.getByIDFlexible(identificador_cliente);
      // console.log(cliente)
      res.status(200).json(cliente);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar todos los clientes.' });
    }
  };

  static getDatosBeneficiado = async (req: Request, res: Response) => {
    const telefono = req.params.telefono;
    try {
      const cliente = await ClienteService.getDatosBeneficiado(telefono);

      if (!cliente) {
        res.status(404).json({ mensaje: 'Cliente no encontrado' });
      } else {
        res.status(200).json(cliente);
      }
    } catch (error) {
      console.error('Error en cliente controlador:', error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoCliente = await ClienteService.createCliente(data);
      res.status(201).json(nuevoCliente);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al crear el cliente.' });
    }
  };


  static updateCliente = async (req: Request, res: Response) => {
    try {
      const { id_cliente } = req.params;
      const data = req.body;
      const resultado = await ClienteService.updateCliente(id_cliente, data);

      if (resultado.error) {
        res.status(resultado.status).json({ mensaje: resultado.error });
      } else {
        res.status(resultado.status).json({ mensaje: resultado.mensaje });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al actualizar el cliente.' });
    }
  };
}