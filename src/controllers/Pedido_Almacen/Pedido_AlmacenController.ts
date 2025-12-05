import type { Request, Response } from 'express';
import { Pedido_AlmacenService } from '../../services/Pedido_Almacen/Pedido_Almacen.service';

export class Pedido_AlmacenController {
  // GET paginado (si lo necesitas)
  static getAllPaginado = async (req: Request, res: Response) => {
    try {
      const data = await Pedido_AlmacenService.getAll();
      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }
  };

  //GET PEDIDOS EN CAPUTRA
  static pedidosEnCaptura = async (req: Request, res: Response) => {
    try {
      const id_cliente_alm = req.query.id_cliente_alm?.toString() || '';
      const data = await Pedido_AlmacenService.pedidosEnCaptura(id_cliente_alm);
      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }
  };
  //GET PEDIDOS EN CAPUTRA
  static pedidosEnCotizacion = async (req: Request, res: Response) => {
    try {
      const id_cliente_alm = req.query.id_cliente_alm?.toString() || '';
      const data = await Pedido_AlmacenService.pedidosEnCotizacion(id_cliente_alm);
      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }
  };

  // GET todos
  static getAll = async (req: Request, res: Response) => {
    try {
      const data = await Pedido_AlmacenService.getAll();
      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }
  };

  // GET por ID
  static getByID = async (req: Request, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const data = await Pedido_AlmacenService.getByID(id_pedido_alm);
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener pedido.' });
    }
  };

  // GET por código interno
  static getByCodInterno = async (req: Request, res: Response) => {
    try {
      const { cod_int } = req.params;
      const data = await Pedido_AlmacenService.getByCodInterno(Number(cod_int));
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener pedido.' });
    }
  };

  // POST crear
  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      // console.log(data);
      const nuevo = await Pedido_AlmacenService.create(data);
      res.status(201).json(nuevo);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al crear pedido.' });
    }
  };

  // PUT actualizar
  static update = async (req: Request, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const data = req.body;

      const actualizado = await Pedido_AlmacenService.update(id_pedido_alm, data);

      if (!actualizado) {
        res.status(404).json({ mensaje: 'No existe el pedido.' });
      }

      res.status(200).json(actualizado);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al actualizar pedido.' });
    }
  };

  // DELETE eliminar
  static delete = async (req: Request, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;

      const eliminado = await Pedido_AlmacenService.delete(id_pedido_alm);

      if (!eliminado) {
        return res.status(404).json({ mensaje: 'No existe el pedido.' });
      }

      res.status(200).json({ eliminado });
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al eliminar pedido.' });
    }
  };

  static getDetalles = async (req: Request, res: Response) => {
    try {
      const { id_pedido } = req.params;
      const detalles = await Pedido_AlmacenService.getDetallesPedido(id_pedido);
      //console.log(detalles);
      res.status(200).json(detalles);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al eliminar pedido.' });
    }
  };
  // GET último consecutivo (si aplica)
  /* static ultimoID = async (_req: Request, res: Response) => {
    try {
      const ultimo = await Pedido_AlmacenService.getUltimoID();
      const siguiente = ultimo + 1;
      res.status(200).json(siguiente);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener consecutivo.' });
    }
  };*/
}
