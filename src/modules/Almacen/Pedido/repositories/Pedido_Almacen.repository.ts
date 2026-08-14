import { v4 as uuidv4 } from 'uuid';
import { literal, Op, QueryTypes, Transaction } from 'sequelize';
import Pedido_Almacen from '../model/Pedido_Almacen';
import { dbLocal } from '../../../../config/db';
import Prioridad_Agente_Reglas from '../../../Comercial/Agente_Venta/model/Prioridad_Agente_Regla';
import { ActualizarDetallesPedidoRequest, ICreatePedidoAlmacen } from '../interface/Pedido_Almacen';

import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Empleado from '../../../RRHH/model/Empleado';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import { isUUID } from '../../../../utils/validaciones';

// Imports extra para el resumen completo
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Detalle_Pedido_Almacen_Asignacion from '../model/Detalle_Pedido_Almacen_Asignacion';
import Detalle_Pedido_Almacen_Chequeo from '../model/Detalle_Pedido_Almacen_Chequeo';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Pedido_Almacen_Empaque from '../../Empaque/model/Pedido_Almacen_Empaque';
import { Bulto_Pedido } from '../../Empaque/model/Bulto_Pedido';
import { Entrega_Pedido } from '../../Empaque/model/Entrega_Pedido';
import { Entrega_Pedido_Detalle } from '../../Empaque/model/Entrega_Pedido_Detalle';


export const Pedido_AlmacenRepository = {
  /*EMPACADO */
  pedidoListoParaEmpacar: async (codigo: string) => {
    const where: any = {
      status_pedido_alm: {
        [Op.in]: ['CH', 'FA']
      }
    };

    if (isUUID(codigo)) {
      where.id_pedido_alm = codigo;
    } else {
      where.cod_int_pedido_alm = codigo;
    }

    const pedido = await Pedido_Almacen.findOne({
      attributes: ['id_pedido_alm', 'cod_int_pedido_alm'],
      where
    });

    return pedido;
  },
  cambiarStatusAEmpacado: async (id_pedido_alm: string) => {
    return await Pedido_Almacen.update(
      { status_pedido_alm: 'EM' },
      { where: { id_pedido_alm } }
    )
  },

  /*FIN EMPACADO */
  /*CHEQUEO */
  pedidoChecado: async (id_pedido_alm: string) => {
    return await Pedido_Almacen.update(
      { status_pedido_alm: 'CH' },
      { where: { id_pedido_alm } }
    )
  },

  pedidosPorChecar: async () => {
    // console.log("ENTRO A REPO PEDIDOS POR CHECAR")
    const pedidos = await Pedido_Almacen.findAll({
      where: {
        status_pedido_alm: { [Op.in]: ['SU', 'CH'] },
        fecha_facturado_pedido_alm: null,
        fin_surtido: { [Op.ne]: null },
      },
      include: [
        {
          model: Cliente_Almacen,
          attributes: ['id_interno_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
        },
        {
          model: Agente_de_Venta,
          attributes: ['id_agente', 'id_empleado'],
          include: [
            {
              model: Empleado,        // Relación Agente -> Empleado
              attributes: ['id_empleado', 'ap_pat_empleado', 'nombre_empleado']
            }
          ]
        }
      ],
      order: [
        // 1) Prioridad: AGE primero
        [literal(`CASE WHEN "Pedido_Almacen"."tipo_pedido_alm" = 'AGE' THEN 0 ELSE 1 END`), 'ASC'],

        // 2) Dentro de cada grupo, por fecha máxima
        ['fecha_max_entrega_alm', 'ASC'],

        // 3) Desempate opcional (por si hay mismas fechas)
        ['cod_int_pedido_alm', 'ASC'],
      ],
    });
    // console.log("PEDIDOS POR CHECAR EN REPO:", pedidos)
    return pedidos;
  },


  asignarPedidoChequeo: async (id_empleado: string, id_pedido_alm: string, t: Transaction) => {
    const pedido = await Pedido_Almacen.findByPk(id_pedido_alm, { transaction: t });
    if (!pedido) throw new Error('Pedido no encontrado');
    pedido.status_pedido_alm = 'CH';
    await pedido.save({ transaction: t });
    return { mensaje: 'Pedido asignado a chequeo.' };
  },
  /*FIN CHEQUEO  */
  /*SURTIDO */
  marcarPedidoComoSurtido: async (id_pedido_alm: string, t?: Transaction) => {
    const pedido = await Pedido_Almacen.findByPk(id_pedido_alm, { transaction: t });
    if (!pedido) throw new Error('Pedido no encontrado');
    pedido.status_pedido_alm = 'CH';
    pedido.fin_surtido = new Date();
    await pedido.save({ transaction: t });
  },
  iniciarSurtido: async (id_pedido_alm: string, t?: Transaction) => {
    const pedido = await Pedido_Almacen.findByPk(id_pedido_alm);
    if (!pedido) throw new Error('Pedido no encontrado');
    pedido.inicio_surtido = new Date();
    await pedido.save({ transaction: t });
  },
  getAllDiaAgente: async (fecha: string, id_agente: string) => {
    const inicioDia = new Date(`${fecha}T00:00:00.000`);
    const finDia = new Date(`${fecha}T23:59:59.999`);

    return await Pedido_Almacen.findAll({
      attributes: ['id_pedido_alm', 'cod_int_pedido_alm', 'id_cliente_pedido_alm', 'status_pedido_alm', 'fecha_facturado_pedido_alm', 'createdAt'],
      where: {
        id_agente_pedido_alm: id_agente,
        createdAt: {
          [Op.between]: [inicioDia, finDia]
        }
      },
      include: [
        {
          model: Cliente_Almacen,
          attributes: ['nom_corto_cliente_alm'],
        }
      ],
      order: [['createdAt', 'ASC']]
    });
  },
  getPedidoMasUrgentePorSurtir: async () => {
    const row = await Pedido_Almacen.findOne({
      where: { status_pedido_alm: 'CA' },
      attributes: ['id_pedido_alm'],
      order: [
        [literal(`CASE WHEN "Pedido_Almacen"."tipo_pedido_alm" = 'AGE' THEN 0 ELSE 1 END`), 'ASC'],
        ['fecha_max_entrega_alm', 'ASC'],
        ['cod_int_pedido_alm', 'ASC'],
      ],
      raw: true
    });

    return row?.id_pedido_alm ?? null;
  },
  porSurtir: async () => {
    return await Pedido_Almacen.findAll({
      attributes: ['id_pedido_alm', 'cod_int_pedido_alm', 'status_pedido_alm', 'fecha_max_entrega_alm', 'id_agente_pedido_alm'],
      where: { status_pedido_alm: 'CA', inicio_surtido: null },
      include: [
        {
          model: Cliente_Almacen,
          attributes: ['id_interno_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
        },
        {
          model: Agente_de_Venta,
          attributes: ['id_agente', 'id_empleado'],
          include: [
            {
              model: Empleado,        // Relación Agente -> Empleado
              attributes: ['id_empleado', 'ap_pat_empleado', 'nombre_empleado']
            }
          ]
        }
      ],
      order: [
        // 1) Prioridad: AGE primero
        [literal(`CASE WHEN "Pedido_Almacen"."tipo_pedido_alm" = 'AGE' THEN 0 ELSE 1 END`), 'ASC'],

        // 2) Dentro de cada grupo, por fecha máxima
        ['fecha_max_entrega_alm', 'ASC'],

        // 3) Desempate opcional (por si hay mismas fechas)
        ['cod_int_pedido_alm', 'ASC'],
      ],

    });
  },
  getPedidosByClienteFacturados: async (id_cliente: string) => {
    return await Pedido_Almacen.findAll({
      attributes: ['id_pedido_alm'],
      where: {
        id_cliente_pedido_alm: id_cliente,
        status_pedido_alm: { [Op.in]: ['FA', 'CA'] }
      },
      order: [['createdAt', 'DESC']],
      limit: 3,
      raw: true
    });
  },
  pedidosEnCaptura: async (id_cliente_alm: string) => {
    return await Pedido_Almacen.findAll({
      where: {
        id_cliente_pedido_alm: id_cliente_alm,
        status_pedido_alm: 'EC'
      }
    });
  },
  getFechaMaxEntrega: async (id_agente: string): Promise<Date> => {
    const fechaPedido = new Date();
    //console.log("FECHA PEDIDO:", fechaPedido)
    const diaSemana = fechaPedido.getDay(); // 0=domingo.
    //console.log("DIA SEMANA:", diaSemana)
    const horaActual = fechaPedido.toTimeString().substring(0, 8); // HH:MM:SS
    //console.log("HORA ACTUAL:", horaActual)
    // 1. Buscar regla para HOY
    const reglaHoy = await Prioridad_Agente_Reglas.findOne({
      where: { id_agente, dia_semana: diaSemana, activa: true }
    });
    //console.log("REGLA HOY:", reglaHoy)
    if (!reglaHoy) throw new Error('No existe regla de horario para este agente en el día actual');

    const horaReciboMax = reglaHoy.hora_recibo_max; // <-- ESTA ES LA IMPORTANTE PARA COMPARAR
    //console.log("HORA RECIBO MAX:", horaReciboMax)
    const horaEntregaMax = reglaHoy.hora_entrega_max; // <-- ESTA ES LA HORA DE ENTREGA DEL DÍA
    //console.log("HORA ENTREGA MAX:", horaEntregaMax)

    // 2. Comparar hora actual con hora_recibo_max
    const pedidoEsAntesDeLimite = horaActual <= horaReciboMax;
    //console.log("PEDIDO ES ANTES DE LIMITE:", pedidoEsAntesDeLimite)
    if (pedidoEsAntesDeLimite) {
      // ENTREGA HOY A hora_entrega_max
      const fecha = new Date(fechaPedido);
      const [hh, mm, ss] = horaEntregaMax.split(':').map(Number);
      fecha.setHours(hh, mm, ss, 0);
      //console.log("FECHA ENTREGA HOY:", fecha)
      return fecha;
    }

    // 3. Buscar regla del día siguiente (o siguiente día válido)
    let diaSiguiente = (diaSemana + 1) % 7;

    let reglaSiguiente = await Prioridad_Agente_Reglas.findOne({
      where: { id_agente, dia_semana: diaSiguiente, activa: true }
    });


    // Si no hay regla para mañana, buscar la siguiente regla disponible
    if (!reglaSiguiente) {
      const reglas = await Prioridad_Agente_Reglas.findAll({
        where: { id_agente, activa: true },
        order: [['dia_semana', 'ASC']]
      });

      if (reglas.length === 0) throw new Error('El agente no tiene reglas activas');

      reglaSiguiente = reglas.find(r => r.dia_semana > diaSemana) || reglas[0];
    }

    // 4. Armar la fecha del siguiente día válido a hora_entrega_max
    const fechaEntrega = new Date(fechaPedido);

    // calcular salto de días
    const saltoDias =
      reglaSiguiente.dia_semana > diaSemana
        ? reglaSiguiente.dia_semana - diaSemana
        : 7 - diaSemana + reglaSiguiente.dia_semana;

    fechaEntrega.setDate(fechaEntrega.getDate() + saltoDias);

    const [hh2, mm2, ss2] = reglaSiguiente.hora_entrega_max.split(':').map(Number);
    fechaEntrega.setHours(hh2, mm2, ss2, 0);

    return fechaEntrega;
  },
  actualizarFinCapturado: async (id_pedido: string, transaction?: Transaction) => {
    const pedido = await Pedido_AlmacenRepository.getByID(id_pedido)
    if (!pedido) return null


    //OBTENER FECHA MAXIMA DE ENTRAGA ALMACEN 
    const fechaMaxEntrega = await Pedido_AlmacenRepository.getFechaMaxEntrega(pedido.id_agente_pedido_alm)

    return await pedido.update({
      fecha_max_entrega_alm: fechaMaxEntrega,
      status_pedido_alm: 'CA'
    },
      { transaction })
  },

  pedidosEnCotizacion: async (id_cliente_alm: string) => {
    return await Pedido_Almacen.findAll({
      where: {
        id_cliente_pedido_alm: id_cliente_alm,
        status_pedido_alm: 'CO'
      }
    });
  },
  getByID: async (id_pedido_alm: string) => {
    return await Pedido_Almacen.findOne({
      where: { id_pedido_alm }, include: [
        {
          model: Cliente_Almacen,
          attributes: ['id_interno_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
        },
        {
          model: Agente_de_Venta,
          attributes: ['id_agente', 'id_empleado'],
          include: [
            {
              model: Empleado,        // Relación Agente -> Empleado
              attributes: ['id_empleado', 'ap_pat_empleado', 'nombre_empleado']
            }
          ]
        }
      ],
    });
  },

  getByCodInterno: async (cod_int_pedido_alm: string, t?: Transaction) => {
    return await Pedido_Almacen.findOne({
      where: { cod_int_pedido_alm },
      transaction: t,
      attributes: ['id_pedido_alm', 'cod_int_pedido_alm'],
    });
  },

  getFolioPedido: async (codigoAgente: string) => {
    const now = new Date();

    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const aa = String(now.getFullYear()).slice(2);

    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    const fecha = `${dd}${mm}${aa}`;
    const hora = `${hh}${min}${ss}${ms}`;
    return `${codigoAgente}_${fecha}_${hora}`;
  },
  create: async (data: ICreatePedidoAlmacen, options?: { transaction?: Transaction }) => {
    return await Pedido_Almacen.create(
      {
        id_pedido_alm: uuidv4(),
        ...data
      },
      options
    );
  },

  actualizarDetallesPedidoRepo: async (data: ActualizarDetallesPedidoRequest) => {
    console.log("DATA DESDE REPO:", data)
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GESTIÓN — lista con rango de fechas, status y búsqueda
  // ══════════════════════════════════════════════════════════════════════════
  getListaGestion: async (params: {
    fecha_inicio: string;
    fecha_fin:    string;
    status?:      string;
    busqueda?:    string;
  }) => {
    const { fecha_inicio, fecha_fin, status, busqueda } = params;
    const where: any = {
      createdAt: {
        [Op.between]: [
          new Date(`${fecha_inicio}T00:00:00.000`),
          new Date(`${fecha_fin}T23:59:59.999`),
        ],
      },
    };
    if (status) where.status_pedido_alm = status;

    const rows = await Pedido_Almacen.findAll({
      where,
      attributes: [
        'id_pedido_alm', 'cod_int_pedido_alm', 'status_pedido_alm', 'tipo_pedido_alm',
        'createdAt', 'inicio_surtido', 'fecha_max_entrega_alm', 'fecha_entrega_al_cliente',
      ],
      include: [
        {
          model: Cliente_Almacen,
          as: 'cliente',
          attributes: ['id_cliente_alm', 'id_interno_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm', 'rfc_cliente_alm'],
        },
        {
          model: Agente_de_Venta,
          as: 'agente',
          attributes: ['cod_identi_agente'],
          include: [{ model: Empleado, as: 'empleado', attributes: ['nombre_empleado', 'ap_pat_empleado'] }],
        },
        {
          model: Detalle_Pedido_Almacen,
          attributes: ['id_detalle_pedido_almacen', 'cant_pedida', 'precio_venta', 'es_oferta'],
          include: [{ model: Articulo, attributes: ['id_artic', 'cod_int_artic', 'des_artic', 'cod_barr_artic'] }],
        },
      ],
      order: [
        [literal(`CASE WHEN fecha_max_entrega_alm IS NULL THEN 1 ELSE 0 END`), 'ASC'],
        ['fecha_max_entrega_alm', 'ASC'],
        ['id_cliente_pedido_alm', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    // Filtro de búsqueda en memoria (folio o nombre cliente)
    if (!busqueda) return rows;
    const q = busqueda.toLowerCase();
    return rows.filter(p => {
      const folio = (p.cod_int_pedido_alm ?? '').toLowerCase();
      const cli   = ((p as any).cliente_almacen?.nom_corto_cliente_alm ?? (p as any).cliente_almacen?.razon_social_cliente_alm ?? '').toLowerCase();
      return folio.includes(q) || cli.includes(q);
    });
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORIAL POR FECHA — todos los pedidos de un día específico
  // ══════════════════════════════════════════════════════════════════════════
  getAllByFecha: async (fecha: string) => {
    const inicio = new Date(`${fecha}T00:00:00.000`);
    const fin = new Date(`${fecha}T23:59:59.999`);

    return await Pedido_Almacen.findAll({
      where: {
        createdAt: { [Op.between]: [inicio, fin] },
      },
      attributes: [
        'id_pedido_alm', 'cod_int_pedido_alm', 'status_pedido_alm', 'tipo_pedido_alm',
        'createdAt', 'inicio_surtido', 'fecha_max_entrega_alm', 'fecha_entrega_al_cliente',
      ],
      include: [
        {
          model: Cliente_Almacen,
          attributes: ['id_interno_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
        },
        {
          model: Agente_de_Venta,
          attributes: ['cod_identi_agente'],
          include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN COMPLETO del pedido:
  //   cabecera + detalles (surtido/chequeo/lotes) + empaque (bultos) + entrega
  // ══════════════════════════════════════════════════════════════════════════
  getResumenCompleto: async (id_pedido_alm: string) => {
    // 1. Cabecera
    const pedido = await Pedido_Almacen.findByPk(id_pedido_alm, {
      include: [
        {
          model: Cliente_Almacen,
          attributes: ['id_interno_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
        },
        {
          model: Agente_de_Venta,
          attributes: ['id_agente', 'cod_identi_agente'],
          include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }],
        },
      ],
    });
    if (!pedido) return null;

    // 2. Detalles con artículo + asignaciones(surtidor) + chequeos(chequeador) + lotes
    const detalles = await Detalle_Pedido_Almacen.findAll({
      where: { id_pedido_almacen: id_pedido_alm },
      include: [
        {
          model: Articulo,
          attributes: ['cod_int_artic', 'des_artic', 'cod_barr_artic'],
        },
        {
          model: Detalle_Pedido_Almacen_Asignacion,
          as: 'asignaciones',
          required: false,
          include: [{
            model: Empleado,
            as: 'surtidor',
            attributes: ['nombre_empleado', 'ap_pat_empleado'],
          }],
        },
        {
          model: Detalle_Pedido_Almacen_Chequeo,
          as: 'chequeos',
          required: false,
          include: [{
            model: Empleado,
            attributes: ['nombre_empleado', 'ap_pat_empleado'],
          }],
        },
        {
          model: Detalle_Pedido_Almacen_Lote,
          as: 'lotes',
          required: false,
          include: [{
            model: Lote_Articulo_Sucursal,
            as: 'lote_articulo_sucursal',
            attributes: ['numero_lote_sucursal', 'fecha_venci_lote_sucursal'],
          }],
        },
      ],
    });

    // 3. Empaque + bultos
    const empaque = await Pedido_Almacen_Empaque.findOne({
      where: { id_pedido_almacen: id_pedido_alm },
      include: [
        {
          model: Empleado,
          as: 'empleado_empaco',
          attributes: ['nombre_empleado', 'ap_pat_empleado'],
        },
        {
          model: Bulto_Pedido,
          as: 'bultos',
          attributes: ['id_bulto', 'cod_bulto', 'tipo_bulto', 'num_bulto', 'total_bulto', 'escaneado'],
          order: [['num_bulto', 'ASC']],
        },
      ],
    });

    // 4. Entrega (llegar vía bultos → entrega_pedido_detalle → entrega_pedido)
    let entrega: Entrega_Pedido | null = null;
    if (empaque) {
      const bultoIds = (empaque.bultos ?? []).map(b => b.id_bulto);
      if (bultoIds.length > 0) {
        const detEnt = await Entrega_Pedido_Detalle.findOne({
          where: { id_bulto: bultoIds[0] },
          include: [{
            model: Entrega_Pedido,
            as: 'entrega',
            include: [
              {
                model: Agente_de_Venta,
                as: 'agente',
                attributes: ['id_agente'],
                include: [{ model: Empleado, attributes: ['nombre_empleado', 'ap_pat_empleado'] }],
              },
              {
                model: Cliente_Almacen,
                as: 'cliente',
                attributes: ['razon_social_cliente_alm', 'nom_corto_cliente_alm'],
              },
            ],
          }],
        });
        entrega = (detEnt as any)?.entrega ?? null;
      }
    }

    return { pedido, detalles, empaque, entrega };
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HOJA DE SURTIDO — datos completos para imprimir la hoja de picking
  // ══════════════════════════════════════════════════════════════════════════
  getHojaSurtido: async (id_pedido_alm: string, id_empresa: string) => {
    // Cabecera del pedido
    const cabecera = await dbLocal.query<any>(`
      SELECT
        pa.id_pedido_alm,
        pa.cod_int_pedido_alm,
        pa.status_pedido_alm,
        pa."createdAt" AS fecha_pedido,
        pa.inicio_surtido,
        ca.id_interno_cliente_alm,
        ca.razon_social_cliente_alm,
        ca.nom_corto_cliente_alm,
        CONCAT(ea.nombre_empleado, ' ', ea.ap_pat_empleado) AS nombre_agente,
        CONCAT(es.nombre_empleado, ' ', es.ap_pat_empleado) AS nombre_surtidor
      FROM pedido_almacen pa
      JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
      LEFT JOIN agente_de_venta av ON av.id_agente = pa.id_agente_pedido_alm
      LEFT JOIN empleado ea ON ea.id_empleado = av.id_empleado
      LEFT JOIN (
        SELECT DISTINCT ON (dpa2.id_pedido_almacen) dpa2.id_pedido_almacen, adpa.id_usuario
        FROM detalle_pedido_almacen dpa2
        JOIN detalle_pedido_almacen_asignacion adpa ON adpa.id_detalle_pedido_almacen = dpa2.id_detalle_pedido_almacen
        ORDER BY dpa2.id_pedido_almacen, adpa.created_at ASC
      ) asig ON asig.id_pedido_almacen = pa.id_pedido_alm
      LEFT JOIN empleado es ON es.id_empleado = asig.id_usuario
      WHERE pa.id_pedido_alm = :id_pedido_alm
      LIMIT 1
    `, { type: QueryTypes.SELECT, replacements: { id_pedido_alm } });

    if (!cabecera.length) return null;

    // Items ordenados por ubicación (1 fila por detalle, JOIN de ubicación con DISTINCT ON para evitar duplicados)
    const items = await dbLocal.query<any>(`
      SELECT
        dpa.id_detalle_pedido_almacen,
        dpa.cant_pedida,
        a.id_artic,
        a.cod_int_artic,
        a.cod_barr_artic,
        a.des_artic,
        CONCAT_WS('-', us.pasillo_ub, us.anaquel_ub, us.nivel_ub, us.posicion_ub) AS ubicacion,
        us.tarima_ub,
        us.tipo_ubicacion,
        COALESCE(
          (SELECT SUM(sul.cantidad) FROM stock_ubicacion_lote sul
           WHERE sul.id_articulo = a.id_artic AND sul.id_empresa_sucursal = :id_empresa),
          0
        ) AS existencia_total
      FROM detalle_pedido_almacen dpa
      JOIN articulo a ON a.id_artic = dpa.id_articulo
      LEFT JOIN (
        SELECT DISTINCT ON (id_articulo, id_empresa_sucursal) id_articulo, id_empresa_sucursal, id_ubicacion_default
        FROM articulo_ubicacion_default
        ORDER BY id_articulo, id_empresa_sucursal
      ) aud ON aud.id_articulo = a.id_artic AND aud.id_empresa_sucursal = :id_empresa
      LEFT JOIN ubicacion_sucursal us ON us.id_ubicacion_sucursal = aud.id_ubicacion_default
      WHERE dpa.id_pedido_almacen = :id_pedido_alm
      ORDER BY us.pasillo_ub NULLS LAST, us.anaquel_ub NULLS LAST, us.nivel_ub NULLS LAST, us.posicion_ub NULLS LAST
    `, { type: QueryTypes.SELECT, replacements: { id_pedido_alm, id_empresa } });

    // Lotes asignados por detalle
    const lotes = await dbLocal.query<any>(`
      SELECT
        dpal.id_detalle_pedido_almacen,
        dpal.cantidad,
        las.id_lote_sucursal,
        las.numero_lote_sucursal,
        las.fecha_venci_lote_sucursal,
        las.migracion,
        dpal.lote_factura_numero,
        dpal.lote_factura_fecha,
        COALESCE(
          (SELECT SUM(sul.cantidad) FROM stock_ubicacion_lote sul
           WHERE sul.id_lote = las.id_lote_sucursal),
          0
        ) AS existencia_lote
      FROM detalle_pedido_almacen_lote dpal
      JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = dpal.id_lote_sucursal
      WHERE dpal.id_detalle_pedido_almacen IN (
        SELECT id_detalle_pedido_almacen FROM detalle_pedido_almacen WHERE id_pedido_almacen = :id_pedido_alm
      )
    `, { type: QueryTypes.SELECT, replacements: { id_pedido_alm } });

    // Agrupar lotes por detalle
    const lotesPorDetalle = new Map<string, any[]>();
    for (const l of lotes) {
      if (!lotesPorDetalle.has(l.id_detalle_pedido_almacen)) {
        lotesPorDetalle.set(l.id_detalle_pedido_almacen, []);
      }
      lotesPorDetalle.get(l.id_detalle_pedido_almacen)!.push(l);
    }

    const itemsConLotes = items.map((item: any) => ({
      ...item,
      lotes: lotesPorDetalle.get(item.id_detalle_pedido_almacen) ?? [],
    }));

    return { cabecera: cabecera[0], items: itemsConLotes };
  },
};
