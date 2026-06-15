import { Op, QueryTypes, Transaction } from 'sequelize';

import { AgenteRepository } from '../../../Comercial/Agente_Venta/repositories/Agente.repository';
import { dbLocal, dbPoly } from '../../../../config/db';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import ClienteAlmacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { ActualizarDetallesPedidoRequest, ICreatePedidoAlmacenCompleto } from '../interface/Pedido_Almacen';
import { Pedido_AlmacenRepository } from '../repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../repositories/Detalle_Pedido_Almacen.repository';
import { Detalle_Pedido_Almacen_LoteRepository } from '../repositories/Detalle_Pedido_Almacen_Lote.repository';
import { Detalle_Pedido_Almacen_AsignacionRepository } from '../repositories/Detalle_Pedido_Almacen_AsignacionRepository';
import { Articulo_Ubicacion_DefaultServices } from '../../../Catalogos/Articulos/feature/Articulo_Ubicacion_Default/Articulo_Ubicacion_Default.service';
import { Stock_Ubicacion_LoteRepository } from '../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository';
import { ICreateDetallePedidoAlmacenLote } from '../interface/Detalle_Pedido_Almacen_Lote.interface';
import { Detalle_Pedido_Almacen_ChequeoRepository } from '../repositories/Detalle_Pedido_Almacen_ChequeoRepository';
import { Detalle_Pedido_NegadoRepository } from '../repositories/Detalle_Pedido_Negado.repository';
import Pedido_Almacen from '../model/Pedido_Almacen';

// ─── Helper privado: preview de UN pedido PolyDB por su número ───────────────
//  Aísla los items de ese pedido específico.
//  Esto corrige el bug original donde previewPolyDB mezclaba artículos de TODOS
//  los pedidos con pdistatuc='P' y solo marcaba como importado al pedido N.
async function _previewPedidoPoly(pdicdpdin: string) {
  const [cabecera, rows] = await Promise.all([
    dbPoly.query<{ clicdclic: string; pdicdpdin: string }>(`
            SELECT clicdclic, pdicdpdin
            FROM pedido
            WHERE empcdempn = 20
              AND pdicdpdin = :pdicdpdin
              AND pdistatuc = 'P'
            LIMIT 1
        `, { type: QueryTypes.SELECT, replacements: { pdicdpdin } }),

    dbPoly.query<{ artcdartn: string; pdicntpdn: string; pdiprevtn: string }>(`
            SELECT DISTINCT p1.artcdartn, p1.pdicntpdn, p1.pdiprevtn
            FROM pedido1 p1
            WHERE p1.empcdempn = 20
              AND p1.pdicdpdin = :pdicdpdin
            ORDER BY p1.artcdartn
        `, { type: QueryTypes.SELECT, replacements: { pdicdpdin } }),
  ]);

  if (!cabecera.length) return null;

  const clicdclic = cabecera[0].clicdclic?.trim() ?? null;

  let cliente_nuevo: { id_cliente_alm: string; razon_social: string; nom_corto: string } | null = null;
  if (clicdclic) {
    const codigoInt = parseInt(clicdclic, 10);
    if (!isNaN(codigoInt)) {
      const cli = await ClienteAlmacen.findOne({
        where: { id_interno_cliente_alm: codigoInt },
        attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
        raw: true,
      }) as any;
      if (cli) {
        cliente_nuevo = {
          id_cliente_alm: cli.id_cliente_alm,
          razon_social: cli.razon_social_cliente_alm,
          nom_corto: cli.nom_corto_cliente_alm,
        };
      }
    }
  }

  const codigosPoly = rows.map(r => Number(r.artcdartn));
  const articulos = codigosPoly.length > 0
    ? await Articulo.findAll({
      where: { cod_int_artic: { [Op.in]: codigosPoly } },
      attributes: ['id_artic', 'cod_int_artic', 'des_artic', 'cod_barr_artic'],
      raw: true,
    }) as any[]
    : [];

  const mapaArticulos = new Map(articulos.map((a: any) => [Number(a.cod_int_artic), a]));

  const items = rows.map(r => {
    const cod = Number(r.artcdartn);
    const art = mapaArticulos.get(cod);
    return {
      artcdartn: cod,
      cantidad: Number(r.pdicntpdn),
      precio: Number(r.pdiprevtn) || 0,
      id_artic: art?.id_artic ?? null,
      des_artic: art?.des_artic ?? null,
      cod_barras: art?.cod_barr_artic ?? null,
      encontrado: !!art,
    };
  });

  return {
    clicdclic,
    pdicdpdin: cabecera[0].pdicdpdin?.trim() ?? pdicdpdin,
    cliente_nuevo,
    items,
    total: items.length,
    encontrados: items.filter(i => i.encontrado).length,
    no_encontrados: items.filter(i => !i.encontrado).length,
  };
}

export const Pedido_AlmacenService = {
  /**CHEQUEO */

  checarArticulo: async (id_pedido_alm: string, cod_barras: string, cantidad: number, id_empleado: string) => {

    const resultado = await Detalle_Pedido_Almacen_ChequeoRepository.checarArticulo(id_pedido_alm, cod_barras, cantidad, id_empleado);

    const detallesPorChecar = await Detalle_Pedido_Almacen_ChequeoRepository.detallesPorChecar(id_pedido_alm);
    const pedidoTerminado = detallesPorChecar.length === 0;

    if (pedidoTerminado) {
      await Pedido_AlmacenRepository.pedidoChecado(id_pedido_alm);
    }

    return {
      articulo: resultado,   // contiene cod_barras, cant_chequeada, filas[]
      pedidoTerminado,
    };
  },
  getPedidoEnChequeo: async (id_empleado: string) => {

    const algunoActivoParaMiUsuario = await Detalle_Pedido_Almacen_ChequeoRepository.algunPedidoAsignadoChequeo(id_empleado);
    const pedidosPorChecar = await Pedido_AlmacenRepository.pedidosPorChecar();

    // console.log(algunoActivoParaMiUsuario)
    return {
      algunoActivoParaMiUsuario,
      pedidosPorChecar
    };
  },
  asignarPedidoChequeo: async (id_empleado: string, id_pedido_alm: string) => {
    //const t0 = Date.now();
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    //   console.log('transaction open:', Date.now() - t0, 'ms');

    try {
      // const t1 = Date.now();
      const pedido = await Pedido_AlmacenRepository.getByCodInterno(id_pedido_alm, t);
      // console.log('getByCodInterno:', Date.now() - t1, 'ms');
      if (!pedido) throw new Error('Pedido no encontrado');

      // const t2 = Date.now();
      await Detalle_Pedido_Almacen_ChequeoRepository.asignarDetallesPedidoAChequeo(id_empleado, pedido.id_pedido_alm, t);
      //  console.log('asignarDetalles total:', Date.now() - t2, 'ms');

      //  const t3 = Date.now();
      await t.commit();
      // console.log('commit:', Date.now() - t3, 'ms');

      // console.log('TOTAL:', Date.now() - t0, 'ms');
      return;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  getDetalleAsignadoChequeo: async (id_empleado: string) => {
    const getDetallesAsignados = await Detalle_Pedido_Almacen_ChequeoRepository.getDetallesAsignados(id_empleado)
    return getDetallesAsignados
  },

  /*FIN CHEQUEO  */
  surtidoArticuloAsignado: async (id_detalle_asignacion: string, reqs: ICreateDetallePedidoAlmacenLote) => {
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      const actualizado = await Detalle_Pedido_Almacen_AsignacionRepository.marcarSurtido(id_detalle_asignacion, t);
      if (!actualizado) throw new Error('No se pudo actualizar el estado del artículo asignado.');

      const id_detalle_pedido = actualizado.id_detalle_pedido_almacen;

      const reqsConIdDetalle = { ...reqs, id_detalle_pedido };

      if (Array.isArray(reqs.lotes) && reqs.lotes.length > 0) {
        await Detalle_Pedido_Almacen_LoteRepository.create(reqsConIdDetalle, t);
      }

      if (reqs.negacion && reqs.negacion.cantidad_negada > 0) {
        await Detalle_Pedido_NegadoRepository.create(
          {
            id_detalle_pedido_almacen: id_detalle_pedido,
            cantidad_negada: reqs.negacion.cantidad_negada,
            motivo: reqs.negacion.motivo,
            comentario: reqs.negacion.comentario ?? null,
          },
          t
        );
      }

      await t.commit();
      return { mensaje: 'Artículo marcado como surtido.' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
  getAllDiaAgente: async (fecha: string, id_agente: string) => {
    const agente = await AgenteRepository.getByIdEmpleado(id_agente)

    return await Pedido_AlmacenRepository.getAllDiaAgente(fecha, agente.id_agente);
  },
  getDetalleAsignado: async (
    id_usuario: string,
    id_empresa: string,
    id_pedido_alm: string,
  ) => {
    const asignacion =
      await Detalle_Pedido_Almacen_AsignacionRepository.getDetalleAsignado(
        id_usuario,
        id_pedido_alm,
      );
    // console.log("ASIGNACIÓN OBTENIDA EN SERVICIO:", asignacion);
    if (!asignacion) {
      const pendientes =
        await Detalle_Pedido_Almacen_AsignacionRepository.countPendientesByPedido(
          id_pedido_alm,
        );

      if (pendientes === 0) {
        await Pedido_AlmacenRepository.marcarPedidoComoSurtido(
          id_pedido_alm
        );
      }

      return null;
    }

    const planSurtidoFefo =
      await Stock_Ubicacion_LoteRepository.getLotesMinimosConUbicaciones(
        asignacion.detalle.id_articulo,
        id_empresa,
        asignacion.detalle.cant_pedida,
      );

    return { asignacion, planSurtidoFefo };
  },

  asignarPedidoSurtidor: async (id_usuario: string, id_empresa: string) => {
    const pedidoMasUrgente = await Pedido_AlmacenRepository.getPedidoMasUrgentePorSurtir();
    if (!pedidoMasUrgente) {
      return { mensaje: 'No hay pedidos por surtir en este momento.' };
    }

    // Obtener artículos del pedido con su cantidad
    const detalles = await Detalle_Pedido_AlmacenRepository.getDetallesConArticuloPorPedido(pedidoMasUrgente);

    // Para cada artículo, obtener su primera ubicación FEFO
    const detallesConUbicacion = await Promise.all(
      detalles.map(async (d) => {
        const plan = await Stock_Ubicacion_LoteRepository.getLotesMinimosConUbicaciones(
          d.id_articulo,
          id_empresa,
          d.cant_pedida,
        );
        return { ...d, ubicacion: plan.detalles[0]?.ubicacion ?? null };
      })
    );

    // Ordenar por pasillo → anaquel → nivel → posición (mismo criterio que FEFO)
    const PASILLO_ORDER: Record<string, number> = {
      'A1': 1, 'A': 2, 'B': 3, 'C': 4, 'D': 5,
      'E': 6, 'F': 7, 'G': 8, 'H': 9, 'H1': 10,
    };

    detallesConUbicacion.sort((a, b) => {
      const ua = a.ubicacion;
      const ub = b.ubicacion;
      if (!ua && !ub) return 0;
      if (!ua) return 1;
      if (!ub) return -1;

      const pa = PASILLO_ORDER[ua.pasillo] ?? 99;
      const pb = PASILLO_ORDER[ub.pasillo] ?? 99;
      if (pa !== pb) return pa - pb;

      const aa = parseInt(ua.anaquel) || 0;
      const ab = parseInt(ub.anaquel) || 0;
      if (aa !== ab) return aa - ab;

      const na = parseInt(ua.nivel) || 0;
      const nb = parseInt(ub.nivel) || 0;
      if (na !== nb) return na - nb;

      return (parseInt(ua.posicion) || 0) - (parseInt(ub.posicion) || 0);
    });

    const detallesOrdenados = detallesConUbicacion.map((d, i) => ({
      id_detalle_pedido_almacen: d.id_detalle_pedido_almacen,
      orden: i + 1,
    }));

    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    await Pedido_AlmacenRepository.iniciarSurtido(pedidoMasUrgente, t);
    await Detalle_Pedido_Almacen_AsignacionRepository.asignarDetallesPedidoASurtidor(id_usuario, detallesOrdenados, t);
    await t.commit();

    return { mensaje: 'Pedido asignado al surtidor.', id_pedido_alm: pedidoMasUrgente };
  },
  getDetallesPedido: async (id_pedido_alm: string) => {

    return await Detalle_Pedido_AlmacenRepository.findByIDPedido(id_pedido_alm);
  },

  porSurtir: async (id_usuario: string) => {
    const algunoActivoParaMiUsuario = await Detalle_Pedido_Almacen_AsignacionRepository.algunPedidoAsignado(id_usuario);
    const pedidosPorSurtir = await Pedido_AlmacenRepository.porSurtir();


    return {
      algunoActivoParaMiUsuario,
      pedidosPorSurtir
    };
  },



  pedidosEnCaptura: async (id_cliente_alm: string) => {
    return await Pedido_AlmacenRepository.pedidosEnCaptura(id_cliente_alm);
  },
  pedidosEnCotizacion: async (id_cliente_alm: string) => {
    return await Pedido_AlmacenRepository.pedidosEnCotizacion(id_cliente_alm);
  },
  getByID: async (id: string) => {
    return await Pedido_AlmacenRepository.getByID(id);
  },

  getByCodInterno: async (cod: string) => {
    return await Pedido_AlmacenRepository.getByCodInterno(cod);
  },

  create: async (data: ICreatePedidoAlmacenCompleto) => {
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      // 1. Validar agente
      const agente = await AgenteRepository.getByIdEmpleado(data.encabezado.id_agente_pedido_alm);
      if (!agente) throw new Error('Agente no encontrado.');

      // 2. Generar folio interno
      const folioPedido = await Pedido_AlmacenRepository.getFolioPedido(agente.cod_identi_agente);
      //CAMBIAR ID_AGENTE
      const encabezado = data.encabezado;
      encabezado.id_agente_pedido_alm = agente.id_agente;


      // 3. Crear pedido
      const nuevoPedido = await Pedido_AlmacenRepository.create(
        {
          ...encabezado,
          cod_int_pedido_alm: folioPedido,

        },
        { transaction: t }
      );



      // 5. Crear / acumular detalles
      for (const item of data.detalle) {
        await Detalle_Pedido_AlmacenRepository.addOrAccumulate(
          {
            ...item,
            id_pedido_almacen: nuevoPedido.id_pedido_alm
          },
          t
        );
      }

      // 6. Si todo salió bien: commit final
      await t.commit();

      return nuevoPedido;
    } catch (error) {
      // 5. Rollback
      await t.rollback();
      throw error;
    }
  },

  actualizarDetallesPedidoServ: async (data: ActualizarDetallesPedidoRequest) => {
    return await Detalle_Pedido_AlmacenRepository.sincronizarCarrito(data);
  },




  finalizarCaptura: async (id_pedido: string) => {
    const t = await dbLocal.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    // console.log("ENTRO A SERVICIO FINALIZAR CAPTURA");

    //CAMBIAR A CA= CAPTURADO 

    const capturado = await Pedido_AlmacenRepository.actualizarFinCapturado(id_pedido, t)
    if (!capturado) throw new Error('No se pudo actualizar el pedido');

    //const repartirLotes = await Detalle_Pedido_Almacen_LoteRepository.create(id_pedido, t)

    const pedidoFull = await Pedido_AlmacenRepository.getByID(id_pedido);
    if (!pedidoFull) throw new Error("No se pudo recargar el pedido")
    await t.commit();

    // console.log("PEDIDO FINALIZADO Y CAPTURADO:", capturado)
    return pedidoFull
  },

  getListaGestion: async (params: { fecha_inicio: string; fecha_fin: string; status?: string; busqueda?: string }) => {
    return await Pedido_AlmacenRepository.getListaGestion(params);
  },

  // ══════════════════════════════════════════════════════════════════════
  // HISTORIAL POR FECHA
  // ══════════════════════════════════════════════════════════════════════
  getAllByFecha: async (fecha: string) => {
    return await Pedido_AlmacenRepository.getAllByFecha(fecha);
  },

  // ══════════════════════════════════════════════════════════════════════
  // RESUMEN COMPLETO — todo el ciclo de vida de un pedido
  // ══════════════════════════════════════════════════════════════════════
  getResumenCompleto: async (id_pedido_alm: string) => {
    const resumen = await Pedido_AlmacenRepository.getResumenCompleto(id_pedido_alm);
    if (!resumen) throw { status: 404, message: 'Pedido no encontrado.' };
    return resumen;
  },

  // ── Preview de UN pedido en PolyDB (el primero pendiente) ──────────────────
  previewPolyDB: async () => {
    const [primera] = await dbPoly.query<{ pdicdpdin: string }>(`
        SELECT pdicdpdin FROM pedido
        WHERE empcdempn = 20 AND pdistatuc = 'P'
        ORDER BY pdicdpdin LIMIT 1
    `, { type: QueryTypes.SELECT });

    if (!primera) throw { status: 404, message: 'No hay pedidos pendientes en PolyDB.' };

    const preview = await _previewPedidoPoly(primera.pdicdpdin);
    if (!preview) throw { status: 404, message: 'No se pudo obtener el preview del pedido.' };
    return preview;
  },

  // ── Preview de TODOS los pedidos pendientes en PolyDB ──────────────────────
  //  Devuelve un resumen por pedido (sin el detalle de artículos) listo para
  //  mostrarlos en la tabla de importación en lote del frontend.
  previewPolyDBLote: async () => {
    const pedidosPoly = await dbPoly.query<{ pdicdpdin: string }>(`
        SELECT DISTINCT pdicdpdin
        FROM pedido
        WHERE empcdempn = 20 AND pdistatuc = 'P'
        ORDER BY pdicdpdin
    `, { type: QueryTypes.SELECT });

    if (!pedidosPoly.length) return [];

    const previews = await Promise.all(
      pedidosPoly.map(async p => {
        const preview = await _previewPedidoPoly(p.pdicdpdin);
        if (!preview) return null;
        return {
          pdicdpdin: Number(p.pdicdpdin),
          clicdclic: preview.clicdclic,
          cliente_nuevo: preview.cliente_nuevo,
          total_articulos: preview.total,
          encontrados: preview.encontrados,
          no_encontrados: preview.no_encontrados,
          puede_importar: preview.encontrados > 0 && !!preview.cliente_nuevo,
        };
      })
    );

    return previews.filter((p): p is NonNullable<typeof p> => p !== null);
  },

  // ── Importar pedido desde PolyDB ────────────────────────────────────
  //  Crea pedido_almacen + detalles usando solo los artículos encontrados.
  importarDePolyDB: async (params: {
    num_pedido: number;
    tipo_pedido: string;
    id_empleado: string;
  }) => {
    const { num_pedido, tipo_pedido } = params;

    // Obtener preview ESPECÍFICO de este pedido (evita mezclar artículos de otros pedidos 'P')
    const preview = await _previewPedidoPoly(String(num_pedido));
    if (!preview) throw { status: 404, message: `No se encontró el pedido ${num_pedido} en PolyDB con estatus P.` };

    const itemsOk = preview.items.filter(i => i.encontrado && i.cantidad > 0);

    if (!itemsOk.length) throw { status: 400, message: 'Ningún artículo del pedido PolyDB está en el catálogo del nuevo sistema.' };
    if (!preview.cliente_nuevo) throw { status: 400, message: `No se encontró el cliente con código PolyDB "${preview.clicdclic}" en el nuevo sistema.` };

    const id_cliente_alm = preview.cliente_nuevo.id_cliente_alm;

    // Obtener id_agente desde el cliente (campo id_agente_cliente_alm)
    const clienteRecord = await ClienteAlmacen.findByPk(id_cliente_alm, {
      attributes: ['id_agente_cliente_alm'],
    });
    if (!clienteRecord || !(clienteRecord as any).id_agente_cliente_alm) {
      throw { status: 400, message: 'El cliente no tiene agente asignado en el nuevo sistema.' };
    }
    const id_agente_alm = (clienteRecord as any).id_agente_cliente_alm as string;

    const t = await dbLocal.transaction();
    //FALTA SACAR LA FECHA DE ENTREGA 

    const [rowsAffected] = await dbPoly.query(`
    UPDATE pedido
    SET pdistatuc = 'B'
    WHERE pdicdpdin = :num_pedido
      AND empcdempn = 20
      AND pdistatuc = 'P'
  `, {
      replacements: { num_pedido },
      type: QueryTypes.UPDATE
    });

    //OBTENER FECHA MAXIMA DE ENTRAGA ALMACEN 
    const fecha_max_entrega_alm = await Pedido_AlmacenRepository.getFechaMaxEntrega(clienteRecord.id_agente_cliente_alm);

    try {
      // Crear cabecera del pedido
      const pedido = await Pedido_AlmacenRepository.create({
        cod_int_pedido_alm: `POLY-${num_pedido}`,
        status_pedido_alm: 'CA',
        tipo_pedido_alm: tipo_pedido || 'AUT',
        id_cliente_pedido_alm: id_cliente_alm,
        id_agente_pedido_alm: id_agente_alm,
        fecha_max_entrega_alm: fecha_max_entrega_alm,
      }, { transaction: t });

      // Crear detalles
      await Detalle_Pedido_AlmacenRepository.bulkCreateDetalles(
        itemsOk.map(i => ({
          id_pedido_almacen: pedido.id_pedido_alm,
          id_articulo: i.id_artic!,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
          es_oferta: false,
        })),
        t
      );

      await t.commit();

      return {
        id_pedido_alm: pedido.id_pedido_alm,
        cod_int_pedido_alm: pedido.cod_int_pedido_alm,
        articulos_importados: itemsOk.length,
        articulos_omitidos: preview.no_encontrados,
      };

    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

};
