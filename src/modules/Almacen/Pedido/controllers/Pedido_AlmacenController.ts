import type { Request, Response } from 'express';
import { Pedido_AlmacenService } from '../services/Pedido_Almacen.service';
import { ActualizarDetallesPedidoRequest } from '../interface/Pedido_Almacen';
import { io } from '../../../../server_ws';
import { AuthedRequest } from '../../../../middleware/auth';
import Pedido_Almacen from '../model/Pedido_Almacen';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import { v4 as uuidv4 } from 'uuid';

export class Pedido_AlmacenController {
  /*CHECARRR */
  static checarArticulo = async (req: AuthedRequest, res: Response) => {
    try {
      const { cod_barras, cantidad } = req.body
      const { id_pedido_alm } = req.params
      const resultado = await Pedido_AlmacenService.checarArticulo(id_pedido_alm, cod_barras, cantidad, req.user.id_referencia_persona)
      res.status(200).json(resultado)
    } catch (error) {
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
      // console.log("PEDIDOS EN COTIZACION:", data);
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



  static cambiarACotizacion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id_pedido } = req.body;
      const [updated] = await Pedido_AlmacenService.cambiarStatusPedido(id_pedido, 'CO');
      if (!updated) {
        res.status(404).json({ mensaje: 'Pedido no encontrado o ya está en cotización.' });
        return;
      }
      res.status(200).json({ mensaje: 'Pedido cambiado a cotización.' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ mensaje: error.message || 'Error al cambiar a cotización.' });
    }
  };

  static cambiarACaptura = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id_pedido } = req.body;
      // Verifica que no tenga ya otro pedido en EC
      const enCaptura = await Pedido_AlmacenService.pedidosEnCaptura(
        (await Pedido_AlmacenService.getClienteDelPedido(id_pedido)) ?? ''
      );
      if (enCaptura.length > 0) {
        res.status(409).json({ mensaje: 'El cliente ya tiene un pedido en captura. Termínalo antes de reactivar este.' });
        return;
      }
      await Pedido_AlmacenService.cambiarStatusPedido(id_pedido, 'EC');
      res.status(200).json({ mensaje: 'Pedido reactivado a captura.' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ mensaje: error.message || 'Error al cambiar a captura.' });
    }
  };

  static verificarCredito = async (req: Request, res: Response) => {
    try {
      const { id_pedido } = req.body;
      const resultado = await Pedido_AlmacenService.verificarCredito(id_pedido);
      res.status(200).json(resultado);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ mensaje: error.message || 'Error al verificar crédito.' });
    }
  };

  //FINALIZAR CAPUTRA
  static finalizarCaptura = async (req: Request, res: Response) => {
    try {
      const { id_pedido } = req.body

      const finalizarPedido = await Pedido_AlmacenService.finalizarCaptura(id_pedido);
      // Emitir el pedido a todos los surtidores conectados
      io.emit('pedido_nuevo_surtir', finalizarPedido);
      res.status(200).json(finalizarPedido);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ message: error?.message ?? 'Error al finalizar pedidos.' });
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

  // PATCH /pedido/:id/fecha-entrega
  static actualizarFechaEntrega = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fecha_max_entrega_alm } = req.body as { fecha_max_entrega_alm: string };
      if (!fecha_max_entrega_alm) { res.status(400).json({ mensaje: 'fecha_max_entrega_alm requerida' }); return; }
      await Pedido_Almacen.update({ fecha_max_entrega_alm: new Date(fecha_max_entrega_alm) }, { where: { id_pedido_alm: id } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ mensaje: error.message });
    }
  };

  // PATCH /pedido/:id_pedido_alm/iniciar-surtido
  static iniciarSurtido = async (req: AuthedRequest, res: Response) => {
    try {
      const result = await Pedido_AlmacenService.iniciarSurtido(req.params.id_pedido_alm);
      res.json(result);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message || 'Error al iniciar surtido.' });
    }
  };

  // GET /pedido/:id_pedido_alm/hoja-surtido
  static getHojaSurtido = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const id_empresa = req.user?.id_empresa;
      const data = await Pedido_AlmacenService.getHojaSurtido(id_pedido_alm, id_empresa);
      res.json(data);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message || 'Error al obtener hoja de surtido.' });
    }
  };

  // POST /pedido/:id_pedido_alm/asignar-surtidor-cod
  // Body: { cod_interno: number }
  static asignarSurtidorPorCodigo = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const { cod_interno } = req.body as { cod_interno: number };
      if (!cod_interno) { res.status(400).json({ message: 'cod_interno requerido' }); return; }
      const id_empresa = req.user?.id_empresa;
      const resultado = await Pedido_AlmacenService.asignarSurtidorPorCodigo(id_pedido_alm, Number(cod_interno), id_empresa);
      res.json(resultado);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message || 'Error al asignar surtidor.' });
    }
  };

  // POST /pedido/:id_pedido_alm/finalizar-surtido-papel
  static finalizarSurtidoPapel = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_alm } = req.params;
      const { detalles } = req.body as { detalles: any[] };
      if (!Array.isArray(detalles) || detalles.length === 0) {
        res.status(400).json({ message: 'Se requiere al menos un detalle.' });
        return;
      }
      const resultado = await Pedido_AlmacenService.finalizarSurtidoPapel(id_pedido_alm, detalles);
      res.json(resultado);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message || 'Error al finalizar surtido.' });
    }
  };

  // GET /pedido/resumen-gestion?fecha_inicio=&fecha_fin=
  static getResumenGestion = async (req: Request, res: Response) => {
    try {
      const { fecha_inicio, fecha_fin } = req.query as Record<string, string>;
      if (!fecha_inicio || !fecha_fin) {
        res.status(400).json({ mensaje: 'fecha_inicio y fecha_fin son requeridos' });
        return;
      }
      const data = await Pedido_AlmacenService.getResumenPorStatus(fecha_inicio, fecha_fin);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ mensaje: error.message || 'Error al obtener resumen.' });
    }
  };

  // GET /pedido/lista-gestion?fecha_inicio=&fecha_fin=&status=&busqueda=
  static getListaGestion = async (req: Request, res: Response) => {
    try {
      const { fecha_inicio, fecha_fin, status, busqueda } = req.query as Record<string, string>;
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      if (!fecha_inicio || !fecha_fin) {
        res.status(400).json({ mensaje: 'fecha_inicio y fecha_fin son requeridos' });
        return;
      }
      const data = await Pedido_AlmacenService.getListaGestion({ fecha_inicio, fecha_fin, status, busqueda, page, limit });
      res.json(data);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ mensaje: error.message || 'Error al obtener pedidos.' });
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
  static previewPolyDBLote = async (req: Request, res: Response) => {
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

  // POST /pedido/:id/detalle  — agrega un renglón al pedido (solo admin)
  static agregarDetalle = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { id_articulo, cant_pedida, precio_venta } = req.body as {
        id_articulo: string; cant_pedida: number; precio_venta: number;
      };
      if (!id_articulo || !cant_pedida) {
        res.status(400).json({ mensaje: 'id_articulo y cant_pedida son requeridos' }); return;
      }
      const pedido = await Pedido_Almacen.findByPk(id, { attributes: ['id_pedido_alm', 'status_pedido_alm'] });
      if (!pedido) { res.status(404).json({ mensaje: 'Pedido no encontrado' }); return; }
      const detalle = await Detalle_Pedido_Almacen.create({
        id_detalle_pedido_almacen: uuidv4(),
        id_pedido_almacen: id,
        id_articulo,
        cant_pedida: Number(cant_pedida),
        precio_venta: Number(precio_venta ?? 0),
        es_oferta: false,
      });
      res.status(201).json(detalle);
    } catch (error: any) {
      res.status(500).json({ mensaje: error.message });
    }
  };

  // DELETE /pedido/:id/detalle/:id_detalle  — elimina un renglón (solo admin)
  static eliminarDetalle = async (req: Request, res: Response) => {
    try {
      const { id, id_detalle } = req.params;
      const deleted = await Detalle_Pedido_Almacen.destroy({
        where: { id_detalle_pedido_almacen: id_detalle, id_pedido_almacen: id },
      });
      if (!deleted) { res.status(404).json({ mensaje: 'Detalle no encontrado' }); return; }
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ mensaje: error.message });
    }
  };

}
