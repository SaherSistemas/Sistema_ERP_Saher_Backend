import type { Request, Response } from 'express';
import { Pedido_AlmacenService } from '../services/Pedido_Almacen.service';
import { ActualizarDetallesPedidoRequest } from '../interface/Pedido_Almacen';
import { io } from '../../../server_ws';

export class Pedido_AlmacenController {
  // GET paginado (si lo necesitas)
  static getAllPorDiaAgente = async (req: Request, res: Response) => {
    try {
      const { fecha, id_user } = req.query as {
        fecha: string;
        id_user: string;
      };
      const data = await Pedido_AlmacenService.getAllDiaAgente(fecha, id_user);
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
      // console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }
  };

  static porSurtir = async (req: Request, res: Response) => {
    try {
      const pedidosPorSurtir = await Pedido_AlmacenService.porSurtir();
      res.status(200).json(pedidosPorSurtir);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }


  }
  static actualizarDetalles = async (req: Request, res: Response) => {
    const data: ActualizarDetallesPedidoRequest = req.body;

    const pedidoAActualizar = await Pedido_AlmacenService.actualizarDetallesPedidoServ(data);

    res.status(200).json("HOLA");
  }



  //FINALIZAR CAPUTRA
  static finalizarCaptura = async (req: Request, res: Response) => {
    try {
      const { id_pedido } = req.body

      const finalizarPedido = await Pedido_AlmacenService.finalizarCaptura(id_pedido);
      // Emitir el pedido a todos los surtidores conectados
      io.emit('pedido_nuevo_surtir', finalizarPedido);
      res.status(200).json(finalizarPedido);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al finalizar pedidos.' });
    }


  }

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

}
