import type { Request, Response } from 'express';
import { Cliente_AlmacenService } from '../../../services/Clientes/Cliente_Almacen/cliente_Almacen.service';

export class Cliente_AlmacenController {
  // GET paginado
  static getAllPaginado = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const clientes = await Cliente_AlmacenService.getAllPaginado(page, limit);
      res.status(200).json(clientes);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener clientes.' });
    }
  };

  // GET por ID flexible
  static getByIDFlexible = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;
      const cliente = await Cliente_AlmacenService.getByIDFlexible(id_cliente_alm);
      res.status(200).json(cliente);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener cliente.' });
    }
  };

  // GET por término de búsqueda
  static getClienteByTermSearch = async (req: Request, res: Response) => {
    try {
      const { term_search } = req.params;
      const clientes = await Cliente_AlmacenService.getClienteByTermSerch(term_search);
      res.status(200).json(clientes);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al buscar clientes.' });
    }
  };

  // GET por agente
  static getAllByUsuarioAgente = async (req: Request, res: Response) => {
    try {
      const { id_empleado } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const nombre = req.query.nombre?.toString() || '';
      const estado = req.query.estado?.toString() || 'A';

      const data = await Cliente_AlmacenService.getAllByUsuarioAgente({
        id_empleado,
        page,
        limit,
        nombre,
        estado
      });

      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener clientes del agente.' });
    }
  };

  // POST crear
  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevo = await Cliente_AlmacenService.create(data);
      res.status(201).json(nuevo);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al crear cliente.' });
    }
  };

  // PUT actualizar
  static update = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;
      const data = req.body;

      const actualizado = await Cliente_AlmacenService.update(id_cliente_alm, data);

      if (!actualizado) res.status(404).json({ mensaje: 'No existe el cliente.' });

      res.status(200).json(actualizado);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
    }
  };
  static ultimoID = async (req: Request, res: Response) => {
    try {
      const ultiomID = await Cliente_AlmacenService.getUltimoID();
      const siguienteID = ultiomID + 1;
      res.status(200).json(siguienteID);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
    }
  };
}
