import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';

import Pedido_Almacen from '../../models/PedidosAlmacen/Pedido_Almacen';
import { ICreatePedidoAlmacen, IPedidoAlmacen } from '../../interface/Pedidos_Almacen/Pedido_Almacen';
import Prioridad_Agente_Reglas from '../../models/Usuarios/Agente_De_Ventas/Prioridad_Agente_Regla';

export const Pedido_AlmacenRepository = {
  getAll: async () => {
    return await Pedido_Almacen.findAll();
  },
  getPedidosByClienteFacturados: async (id_cliente: string) => {
    return await Pedido_Almacen.findAll({
      attributes: ['id_pedido_alm'],
      where: {
        id_cliente_pedido_alm: id_cliente,
        status_pedido_alm: 'FA'
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
  getFechaMaxEntrega: async (id_agente: string, fechaPedido: Date): Promise<Date> => {
    const diaSemana = fechaPedido.getDay(); // 0=domingo
    const horaActual = fechaPedido.toTimeString().substring(0, 8); // HH:MM:SS

    // 1. Buscar regla para HOY
    const reglaHoy = await Prioridad_Agente_Reglas.findOne({
      where: { id_agente, dia_semana: diaSemana, activa: true }
    });

    if (!reglaHoy) throw new Error('No existe regla de horario para este agente en el día actual');

    const horaReciboMax = reglaHoy.hora_recibo_max; // <-- ESTA ES LA IMPORTANTE PARA COMPARAR
    const horaEntregaMax = reglaHoy.hora_entrega_max; // <-- ESTA ES LA HORA DE ENTREGA DEL DÍA

    // 2. Comparar hora actual con hora_recibo_max
    const pedidoEsAntesDeLimite = horaActual <= horaReciboMax;

    if (pedidoEsAntesDeLimite) {
      // ENTREGA HOY A hora_entrega_max
      const fecha = new Date(fechaPedido);
      const [hh, mm, ss] = horaEntregaMax.split(':').map(Number);
      fecha.setHours(hh, mm, ss, 0);
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

  pedidosEnCotizacion: async (id_cliente_alm: string) => {
    return await Pedido_Almacen.findAll({
      where: {
        id_cliente_pedido_alm: id_cliente_alm,
        status_pedido_alm: 'CO'
      }
    });
  },
  getByID: async (id_pedido_alm: string) => {
    return await Pedido_Almacen.findOne({ where: { id_pedido_alm } });
  },

  getByCodInterno: async (cod_int_pedido_alm: number) => {
    return await Pedido_Almacen.findOne({
      where: { cod_int_pedido_alm }
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

  update: async (id_pedido_alm: string, data: Partial<ICreatePedidoAlmacen>): Promise<boolean> => {
    const pedido = await Pedido_Almacen.findByPk(id_pedido_alm);
    if (!pedido) return false;

    await pedido.update(data);
    return true;
  },

  delete: async (id_pedido_alm: string): Promise<boolean> => {
    const deleted = await Pedido_Almacen.destroy({
      where: { id_pedido_alm }
    });
    return deleted > 0;
  }
};
