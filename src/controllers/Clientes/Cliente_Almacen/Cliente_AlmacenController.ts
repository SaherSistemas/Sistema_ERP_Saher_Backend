import type { Request, Response } from 'express';
import { Cliente_AlmacenService } from '../../../services/Clientes/Cliente_Almacen/cliente_Almacen.service';

export class Cliente_AlmacenController {
  static getAllPaginado = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const clientes_almacen = await Cliente_AlmacenService.getAllPaginado(page, limit);
      res.status(200).json(clientes_almacen);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar todos los clientes.' });
    }
  };

  static getByIDFlexible = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;

      //console.log(identificador_cliente);
      const cliente = await Cliente_AlmacenService.getByIDFlexible(id_cliente_alm);
      // console.log(cliente)
      res.status(200).json(cliente);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar todos los clientes.' });
    }
  };

  static getClienteByTermSearch = async (req: Request, res: Response) => {
    try {
      const { term_search } = req.params;
      const clientesFiltro = await Cliente_AlmacenService.getClienteByTermSerch(term_search);
      res.status(200).json(clientesFiltro);
    } catch (error) {
      //console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar los clientes por filtro.' });
    }
  };

  static getAllByAgente = async (req: Request, res: Response) => {
    try {
      const { id_agente } = req.params;
      const clientesDeAgente = await Cliente_AlmacenService.getAllByAgente(id_agente);
      res.status(200).json(clientesDeAgente);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al encontrar a los clientes del agente.' });
    }
  };
}
