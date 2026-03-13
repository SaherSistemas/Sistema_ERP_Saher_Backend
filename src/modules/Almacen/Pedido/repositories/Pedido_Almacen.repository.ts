import { v4 as uuidv4 } from 'uuid';
import { literal, Op, Transaction } from 'sequelize';
import Pedido_Almacen from '../model/Pedido_Almacen';
import Prioridad_Agente_Reglas from '../../../Comercial/Agente_Venta/model/Prioridad_Agente_Regla';
import { ActualizarDetallesPedidoRequest, ICreatePedidoAlmacen } from '../interface/Pedido_Almacen';

import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Empleado from '../../../RRHH/model/Empleado';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';


export const Pedido_AlmacenRepository = {

  /*CHEQUEO */
  pedidosPorChecar: async () => {
    // console.log("ENTRO A REPO PEDIDOS POR CHECAR")
    const pedidos = await Pedido_Almacen.findAll({
      where: {
        status_pedido_alm: 'SU',
        fecha_facturado_pedido_alm: null
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
    pedido.status_pedido_alm = 'SU';
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
      attributes: ['id_pedido_alm', 'cod_int_pedido_alm', 'id_cliente_pedido_alm', 'status_pedido_alm'],
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


};
