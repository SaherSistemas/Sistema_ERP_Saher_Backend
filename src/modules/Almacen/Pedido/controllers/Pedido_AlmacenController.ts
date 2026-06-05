import type { Request, Response } from 'express';
import { Pedido_AlmacenService } from '../services/Pedido_Almacen.service';
import { ActualizarDetallesPedidoRequest } from '../interface/Pedido_Almacen';
import { io } from '../../../../server_ws';
import { AuthedRequest } from '../../../../middleware/auth';

export class Pedido_AlmacenController {
  /*CHECARRR */
  static checarArticulo = async (req: AuthedRequest, res: Response) => {
    try {
      const { cod_barras, cantidad } = req.body
      const { id_pedido_alm } = req.params
      //  console.log(cod_barras, cantidad, id_pedido_alm)
      const resultado = await Pedido_AlmacenService.checarArticulo(id_pedido_alm, cod_barras, cantidad, req.user.id_referencia_persona)
      res.status(200).json(resultado)
    } catch (error) {
      console.log(error);
      const msg = error.message ?? "Error desconocido";

      if (msg.includes("no encontrado")) {
        res.status(404).json({ message: msg });
        return;
      }

      if (msg.includes("excede")) {
        res.status(422).json({ message: msg });
        return;
      }

      res.status(500).json({ message: msg });
    }
  }
  static asignarPedidoChequeo = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const resultado = await Pedido_AlmacenService.asignarPedidoChequeo(req.user.id_referencia_persona, id_pedido_alm);
      res.status(200).json(resultado);
    }
    catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al asignar pedido a chequeo.' });
    }
  }

  static getDetallesAsignadoChequeo = async (req: AuthedRequest, res: Response) => {
    try {
      const resultado = await Pedido_AlmacenService.getDetalleAsignadoChequeo(req.user.id_referencia_persona);
      //console.log(resultado)
      res.status(200).json(resultado);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener detalles asignados a chequeo.' });
    }
  }

  static pedidosEnChequeo = async (req: AuthedRequest, res: Response) => {
    try {
      const { algunoActivoParaMiUsuario, pedidosPorChecar } = await Pedido_AlmacenService.getPedidoEnChequeo(req.user.id_referencia_persona);
      // console.log("ALGUNO ACTIVO PARA MI USUARIO:", algunoActivoParaMiUsuario);
      // console.log("PEDIDOS POR SURTIR:", pedidosPorChecar);
      res.status(200).json({ algunoActivoParaMiUsuario, pedidosPorChecar });
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener detalles asignados a chequeo.' });
    }

  }
  /*FIN CHEQUEO  */
  static surtidoArticuloAsignado = async (req: AuthedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const reqs = req.body;
      // console.log(reqs)
      const resultado = await Pedido_AlmacenService.surtidoArticuloAsignado(id, reqs);
      res.status(200).json(resultado);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al actualizar estado del artículo.' });
    }
  }
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
  static asignarPedidoSurtidor = async (req: AuthedRequest, res: Response) => {
    try {
      const resultado = await Pedido_AlmacenService.asignarPedidoSurtidor(req.user.id_referencia_persona, req.user.id_empresa);
      res.status(200).json(resultado);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener pedidos.' });
    }
  };
  static getDetallesAsignado = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      //console.log("ID PEDIDO ALMACEN:", id_pedido_alm);
      const resultado = await Pedido_AlmacenService.getDetalleAsignado(req.user.id_referencia_persona, req.user.id_empresa, id_pedido_alm);
      // console.log("DETALLES ASIGNADOS:", JSON.stringify(resultado, null, 2));
      res.status(200).json(resultado);
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

  static porSurtir = async (req: AuthedRequest, res: Response) => {
    try {
      const { algunoActivoParaMiUsuario, pedidosPorSurtir } = await Pedido_AlmacenService.porSurtir(req.user.id_referencia_persona);
      //  console.log("ALGUNO ACTIVO PARA MI USUARIO:", algunoActivoParaMiUsuario);
      //console.log("PEDIDOS POR SURTIR:", pedidosPorSurtir);
      res.status(200).json({ algunoActivoParaMiUsuario, pedidosPorSurtir });
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
      const data = await Pedido_AlmacenService.getByCodInterno(cod_int);
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

  // GET /pedido/historial?fecha=YYYY-MM-DD
  static getHistorialPorFecha = async (req: Request, res: Response) => {
    try {
      const { fecha } = req.query as { fecha?: string };
      if (!fecha) { res.status(400).json({ mensaje: 'Parámetro fecha requerido (YYYY-MM-DD).' }); return; }
      const data = await Pedido_AlmacenService.getAllByFecha(fecha);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ mensaje: error.message || 'Error al obtener el historial.' });
    }
  };

  // GET /pedido/:id_pedido_alm/resumen-completo
  static getResumenCompleto = async (req: Request, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const data = await Pedido_AlmacenService.getResumenCompleto(id_pedido_alm);
      res.status(200).json(data);
    } catch (error: any) {
      console.log(error);
      res.status(error.status || 500).json({ mensaje: error.message || 'Error al obtener el resumen del pedido.' });
    }
  };

  // ── GET /pedido/preview-polydb/lote ──────────────────────────────────
  // Devuelve TODOS los pedidos pendientes en PolyDB como lista de resúmenes.
  /* static previewPolyDBLote = async (req: Request, res: Response) => {
     try {
       const data = await Pedido_AlmacenService.previewPolyDBLote();
       res.status(200).json(data);
     } catch (error: any) {
       res.status(error.status || 500).json({ mensaje: error.message || 'Error al consultar PolyDB.' });
     }
   };
 
   // ── GET /pedido/preview-polydb ────────────────────────────────────────
   // Devuelve el primer pedido pendiente en PolyDB (compatibilidad).
   static previewPolyDB = async (req: Request, res: Response) => {
     try {
 
       const data = await Pedido_AlmacenService.previewPolyDB();
       res.status(200).json(data);
     } catch (error: any) {
       res.status(error.status || 500).json({ mensaje: error.message || 'Error al consultar PolyDB.' });
     }
   };
 
   // ── POST /pedido/importar-polydb ──────────────────────────────────────────
   // Body: { num_pedido, fecha_max_entrega, tipo_pedido? }
   // Cliente y agente se resuelven desde clicdclic de PolyDB automáticamente
   static importarDePolyDB = async (req: AuthedRequest, res: Response) => {
     try {
       const { num_pedido, tipo_pedido } = req.body;
       if (!num_pedido) {
         res.status(400).json({ mensaje: 'Faltan campos: num_pedido.' });
         return;
       }
       const data = await Pedido_AlmacenService.importarDePolyDB({
         num_pedido: parseInt(num_pedido, 10),
         tipo_pedido: tipo_pedido || 'AGE',
         id_empleado: req.user!.id_referencia_persona,
       });
       res.status(201).json(data);
     } catch (error: any) {
       console.log(error);
       res.status(error.status || 500).json({ mensaje: error.message || 'Error al importar pedido de PolyDB.' });
     }
   };
 */
}
