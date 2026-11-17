import { Op, QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { v4 as uuidv4 } from 'uuid';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import { ICreateDetallePedidoAlmacen, } from '../interface/Detalle_Pedido_Almacen.interface';
import { ActualizarDetallesPedidoRequest, IUpdatePedidoAlmacen } from '../interface/Pedido_Almacen';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Detalle_Pedido_Almacen_Chequeo from '../model/Detalle_Pedido_Almacen_Chequeo';
import Detalle_Pedido_Negado from '../model/Detalle_Pedido_Negado';
import Pedido_Almacen from '../model/Pedido_Almacen';


// ¿El renglón ya tiene trabajo de almacén (lotes surtidos, chequeo, asignación o negados)? Si lo tiene, no se debe borrar
async function tieneDependientes(id_detalle: string, t?: Transaction): Promise<boolean> {
  const [r] = await dbLocal.query<any>(`
    SELECT (
      (SELECT COUNT(*) FROM detalle_pedido_almacen_lote       WHERE id_detalle_pedido_almacen = :id)
    + (SELECT COUNT(*) FROM detalle_pedido_almacen_chequeo    WHERE id_detalle_pedido_almacen = :id)
    + (SELECT COUNT(*) FROM detalle_pedido_almacen_asignacion WHERE id_detalle_pedido_almacen = :id)
    + (SELECT COUNT(*) FROM detalle_pedido_negado             WHERE id_detalle_pedido_almacen = :id)
    )::int AS n
  `, { replacements: { id: id_detalle }, type: QueryTypes.SELECT, transaction: t });
  return Number(r?.n) > 0;
}

export const Detalle_Pedido_AlmacenRepository = {
  getIdsDetallesPorPedido: async (id_pedido_alm: string, t?: Transaction) => {
    return await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen: id_pedido_alm },
      attributes: ['id_detalle_pedido_almacen'],
      raw: true,
      transaction: t
    });
  },
  findByID: async (id_detalle_pedido_almacen: string) => {
    return await Detalle_Pedido_Almacen.findByPk(id_detalle_pedido_almacen, {
      include: [{
        model: Articulo,
        attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva']
      }]
    });
  },

  addOrAccumulate: async (data: ICreateDetallePedidoAlmacen, t?: Transaction): Promise<Detalle_Pedido_Almacen> => {
    // 1. Buscar si ya existe el articulo en ese mismo pedido

    //console.log(data);
    const existente = await Detalle_Pedido_Almacen.findOne({
      where: {
        id_pedido_almacen: data.id_pedido_almacen,
        id_articulo: data.id_articulo
      },
      transaction: t
    });

    // 2. Si ya existe → ACUMULAR
    if (existente) {
      existente.cant_pedida = existente.cant_pedida + data.cantidad;

      await existente.save({ transaction: t });
      return existente;
    }

    // 3. Si no existe → CREAR NUEVO
    const nuevo = await Detalle_Pedido_Almacen.create(
      {
        id_detalle_pedido_almacen: uuidv4(),
        id_pedido_almacen: data.id_pedido_almacen,
        id_articulo: data.id_articulo,
        cant_pedida: data.cantidad,
        cantidad_surtida: 0,
        cantidad_checada: 0,
        precio_venta: data.precio_unitario,
        es_oferta: data.es_oferta ?? false
      },
      { transaction: t }
    );

    return nuevo;
  },

  // Guarda el carrito del pedido (lo manda el agente desde la web y el administrador desde el escritorio).
  // - Se hace en una transacción y se BLOQUEA el pedido: dos guardados al mismo tiempo (el guardado automático cada 2 s se empalmaba
  //   con otro) ya no pueden crear dos veces el mismo renglón.
  // - Un artículo es un solo renglón: si el carrito trae el mismo artículo repetido se juntan (suma de piezas y precio promedio ponderado).
  // - Si el pedido ya tiene renglones repetidos del mismo artículo (de guardados empalmados anteriores) se deja uno y se quitan los
  //   demás, siempre que no tengan surtido, chequeo, asignación o negados.
  sincronizarCarrito: async (data: ActualizarDetallesPedidoRequest, tExterna?: Transaction) => {
    const { id_pedido, carrito, id_paqueteria } = data;

    // Protección: nunca borrar todo el pedido si el carrito llega vacío
    // (puede ocurrir si el frontend tuvo error al cargar y manda [] accidentalmente)
    if (!carrito || carrito.length === 0) return true;

    const propia = !tExterna;
    const t = tExterna ?? await dbLocal.transaction();
    try {
      // Bloquea el pedido: el segundo guardado espera a que termine el primero y ya ve sus renglones
      await Pedido_Almacen.findByPk(id_pedido, { attributes: ['id_pedido_alm'], transaction: t, lock: t.LOCK.UPDATE });

      // 0. El mismo artículo repetido en el carrito se junta en un solo renglón
      const juntos = new Map<string, { id_articulo: string; cant: number; importe: number; ultimoPrecio: number; iva: any }>();
      for (const item of carrito) {
        const cant = Number(item.cant_pedido) || 0;
        const precio = Number(item.precio_venta) || 0;
        const prev = juntos.get(item.id_articulo);
        if (prev) {
          prev.cant += cant; prev.importe += cant * precio; prev.ultimoPrecio = precio; prev.iva = item.iva ?? prev.iva;
        } else {
          juntos.set(item.id_articulo, { id_articulo: item.id_articulo, cant, importe: cant * precio, ultimoPrecio: precio, iva: item.iva });
        }
      }
      const carritoFinal = Array.from(juntos.values()).map(x => ({
        id_articulo: x.id_articulo,
        cant_pedido: x.cant,
        precio_venta: x.cant > 0 ? Math.round((x.importe / x.cant) * 10000) / 10000 : x.ultimoPrecio,
        iva: x.iva,
      }));

      // 1. Obtener todos los detalles actuales del pedido
      let detallesActuales = await Detalle_Pedido_Almacen.findAll({
        where: { id_pedido_almacen: id_pedido },
        order: [['id_detalle_pedido_almacen', 'ASC']],
        transaction: t,
      });

      // 1b. Renglones repetidos del mismo artículo: se queda uno (el que ya tenga surtido/chequeo/etc., o el primero)
      const porArticulo = new Map<string, Detalle_Pedido_Almacen[]>();
      for (const d of detallesActuales) {
        const arr = porArticulo.get(d.id_articulo) ?? [];
        arr.push(d);
        porArticulo.set(d.id_articulo, arr);
      }
      const quitados = new Set<string>();
      for (const grupo of porArticulo.values()) {
        if (grupo.length < 2) continue;
        const conHijos: boolean[] = [];
        for (const d of grupo) conHijos.push(await tieneDependientes(d.id_detalle_pedido_almacen, t));
        const idxConservar = conHijos.findIndex(Boolean) >= 0 ? conHijos.findIndex(Boolean) : 0;
        for (let i = 0; i < grupo.length; i++) {
          if (i === idxConservar || conHijos[i]) continue;   // el que se queda, y los que tienen trabajo de almacén, no se tocan
          await grupo[i].destroy({ transaction: t });
          quitados.add(grupo[i].id_detalle_pedido_almacen);
        }
      }
      detallesActuales = detallesActuales.filter(d => !quitados.has(d.id_detalle_pedido_almacen));

      const idsArticulosNuevoCarrito = carritoFinal.map(item => item.id_articulo);

      // Un artículo sin precio (menos de 1 centavo) no se puede pedir. Se rechaza lo NUEVO o lo que BAJA a cero;
      // un renglón que ya estaba guardado en cero y no cambia se deja pasar para no bloquear pedidos viejos.
      const sinPrecio = carritoFinal.filter(item => {
        if (Number(item.precio_venta) >= 0.01) return false;
        const existente = detallesActuales.find(d => d.id_articulo === item.id_articulo);
        return !(existente && Number(existente.precio_venta) < 0.01);
      });
      if (sinPrecio.length > 0) {
        const arts = await Articulo.findAll({
          where: { id_artic: { [Op.in]: sinPrecio.map(i => i.id_articulo) } },
          attributes: ['id_artic', 'des_artic'],
          raw: true,
          transaction: t,
        }) as any[];
        const nombres = sinPrecio.map(i => arts.find(a => a.id_artic === i.id_articulo)?.des_artic ?? i.id_articulo);
        throw {
          status: 400,
          message: `Hay artículos sin precio asignado, no se pueden pedir: ${nombres.join(', ')}. Quítalos del pedido.`,
        };
      }

      // 2. Eliminar los detalles que ya no están en el carrito,
      //    excepto los que tienen registro en detalle_pedido_negado (se conservan para compras)
      const detallesAEliminar = detallesActuales.filter(d => !idsArticulosNuevoCarrito.includes(d.id_articulo));
      for (const detalle of detallesAEliminar) {
        const tieneNegado = await Detalle_Pedido_Negado.findOne({
          where: { id_detalle_pedido_almacen: detalle.id_detalle_pedido_almacen },
          transaction: t,
        });
        if (tieneNegado) continue; // conservar — compras lo necesita
        await detalle.destroy({ transaction: t });
      }

      // 3. Actualizar o crear los detalles restantes
      for (const item of carritoFinal) {
        const detalleExistente = detallesActuales.find(d => d.id_articulo === item.id_articulo);

        if (detalleExistente) {
          // Actualizar
          detalleExistente.cant_pedida = item.cant_pedido;
          detalleExistente.precio_venta = item.precio_venta;
          await detalleExistente.save({ transaction: t });
        } else {
          // Crear nuevo
          const nuevo = await Detalle_Pedido_Almacen.create({
            id_detalle_pedido_almacen: uuidv4(),
            id_pedido_almacen: id_pedido,
            id_articulo: item.id_articulo,
            cant_pedida: item.cant_pedido,
            cantidad_surtida: 0,
            cantidad_checada: 0,
            precio_venta: item.precio_venta,
            iva: item.iva,
            es_oferta: false
          }, { transaction: t });
          detallesActuales.push(nuevo);
        }
      }

      if (id_paqueteria !== undefined) {
        await Pedido_Almacen.update(
          { id_paqueteria: id_paqueteria || null },
          { where: { id_pedido_alm: id_pedido }, transaction: t }
        );
      }

      if (propia) await t.commit();
      return true;
    } catch (err) {
      if (propia) await t.rollback().catch(() => undefined);
      throw err;
    }
  },
  getDetallesPorPedido: async (id_pedido_alm: string, t?: Transaction) => {
    // Excluir detalles que tienen registro negado (van a compras, no al almacenista)
    const todosDetalles = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen: id_pedido_alm },
      transaction: t,
    });
    const idsNegados = (await Detalle_Pedido_Negado.findAll({
      attributes: ['id_detalle_pedido_almacen'],
      raw: true,
      transaction: t,
    })).map((r: any) => r.id_detalle_pedido_almacen);
    const detalles = todosDetalles.filter(d => !idsNegados.includes(d.id_detalle_pedido_almacen));
    if (!detalles) throw new Error('Detalles no encontrado');
    return detalles;
  },
  getDetallesPorPedidoYLotesSurtidos: async (id_pedido_alm: string, t?: Transaction) => {
    // Excluir detalles negados (pertenecen a compras, no al almacenista)
    const idsNegados = (await Detalle_Pedido_Negado.findAll({
      attributes: ['id_detalle_pedido_almacen'],
      raw: true,
      transaction: t,
    })).map((r: any) => r.id_detalle_pedido_almacen);

    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: {
        id_pedido_almacen: id_pedido_alm,
        id_detalle_pedido_almacen: { [Op.notIn]: idsNegados.length ? idsNegados : ['00000000-0000-0000-0000-000000000000'] },
      },
      attributes: [
        'id_detalle_pedido_almacen',
        'cant_pedida',
      ],
      include: [
        {
          model: Articulo,
          as: 'articulo',
          attributes: ['cod_barr_artic', 'des_artic'],
          required: false
        },
        {
          model: Detalle_Pedido_Almacen_Lote,
          as: 'lotes',
          attributes: [
            'id_lote_sucursal',
            'cantidad'
          ],
          required: false,
          include: [
            {
              model: Lote_Articulo_Sucursal,
              as: 'lote_articulo_sucursal',
              attributes: [
                'numero_lote_sucursal',
                'fecha_venci_lote_sucursal'
              ],
              required: false
            }
          ]
        }
      ],
      raw: true,
      transaction: t
    });
    return detalles;
  },
  getDetallesPorPedidoIDS: async (id_pedido_almacen: string, t?: Transaction) => {
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      attributes: ['id_detalle_pedido_almacen'],
      raw: true,
      transaction: t
    });

    return detalles.map((d: { id_detalle_pedido_almacen: string }) => d.id_detalle_pedido_almacen);
  },

  getDetallesConArticuloPorPedido: async (id_pedido_almacen: string, t?: Transaction) => {
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      attributes: ['id_detalle_pedido_almacen', 'id_articulo', 'cant_pedida'],
      raw: true,
      transaction: t
    });
    return detalles as Array<{ id_detalle_pedido_almacen: string; id_articulo: string; cant_pedida: number }>;
  },

  findByIDPedido: async (id_pedido_almacen: string) => {
    return await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen },
      include: [
        {
          model: Articulo,
          attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva']
        },
        {
          model: Detalle_Pedido_Almacen_Chequeo,
          attributes: [
            'id_detalle_chequeo',
            'id_empleado',
            'estado',
            'fecha_asignado',
            'inicio',
            'fin',
            'cant_chequeada',
            'nota',
            'cant_surtida_lote'
          ]
        }
      ],
    });
  },

  // ── Inserción masiva de detalles (para importación desde PolyDB) ──────
  bulkCreateDetalles: async (
    items: Array<{
      id_pedido_almacen: string;
      id_articulo:       string;
      cantidad:          number;
      precio_unitario:   number;
      es_oferta:         boolean;
    }>,
    t: Transaction,
  ) => {
    // Un artículo es un solo renglón: si viene repetido (por ejemplo en un pedido de PolyDB) se suman las piezas
    // y el precio queda como promedio ponderado
    const juntos = new Map<string, { base: typeof items[number]; cant: number; importe: number }>();
    for (const i of items) {
      const prev = juntos.get(i.id_articulo);
      if (prev) { prev.cant += i.cantidad; prev.importe += i.cantidad * i.precio_unitario; }
      else juntos.set(i.id_articulo, { base: i, cant: i.cantidad, importe: i.cantidad * i.precio_unitario });
    }
    return await Detalle_Pedido_Almacen.bulkCreate(
      Array.from(juntos.values()).map(({ base, cant, importe }) => ({
        id_detalle_pedido_almacen: uuidv4(),
        ...base,
        cantidad: cant,
        cant_pedida: cant,
        precio_venta: cant > 0 ? Math.round((importe / cant) * 10000) / 10000 : base.precio_unitario,
      })),
      { transaction: t }
    );
  },

};
