import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import Pedido_Almacen_Empaque from '../model/Pedido_Almacen_Empaque';
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen';
import { IActualizarBultosPayload, IFinalizarEmpaquePayload } from '../interface/Pedido_Almacen_Empaque.interface';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';



export const Pedido_Almacen_EmpaqueRepository = {
  obtenerPedidoEmpacando: async (t?: Transaction) => {
    return await Pedido_Almacen_Empaque.findOne({
      include: [
        {
          model: Pedido_Almacen,
          as: 'pedido',
          attributes: [
            'id_pedido_alm',
            'cod_int_pedido_alm',
            'status_pedido_alm',
            'fecha_entrega_alm',
            'fecha_max_entrega_alm',
            'tipo_pedido_alm'
          ]
        }
      ],
      where: { estado: 'EN_PROCESO' },
      transaction: t
    })
  },

  getById: async (id_pedido_chequeo: string, t?: Transaction) => {
    const row = await Pedido_Almacen_Empaque.findByPk(id_pedido_chequeo, {
      include: [
        {
          model: Pedido_Almacen,
          as: 'pedido',
          attributes: ['id_pedido_alm', 'cod_int_pedido_alm']
        }
      ],
      transaction: t
    });

    return row;
  },

  iniciarEmpaquePedido: async (
    id_pedido_almacen: string,
    id_empleado_empaco: string,
    t?: Transaction
  ) => {
    let empaque = await Pedido_Almacen_Empaque.findOne({
      where: { id_pedido_almacen },
      transaction: t
    });

    if (!empaque) {
      empaque = await Pedido_Almacen_Empaque.create(
        {
          id_pedido_empaque: uuidv4(),
          id_pedido_almacen,
          id_empleado_empaco,
          estado: 'EN_PROCESO',
          fecha_asignado: new Date(),
          inicio: new Date(),
          cajas: 0,
          bolsas: 0,
          nota: null
        },
        { transaction: t }
      );
    } else {
      if (empaque.estado === 'EMPACADO') {
        throw new Error('El pedido ya fue empacado');
      }

      await empaque.update(
        {
          id_empleado_empaco,
          estado: 'EN_PROCESO',
          fecha_asignado: empaque.fecha_asignado ?? new Date(),
          inicio: empaque.inicio ?? new Date()
        },
        { transaction: t }
      );
    }

    const empaqueCompleto = await Pedido_Almacen_Empaque.findOne({
      where: {
        id_pedido_empaque: empaque.id_pedido_empaque
      },
      include: [
        {
          model: Pedido_Almacen,
          as: 'pedido',
          attributes: [
            'id_pedido_alm',
            'cod_int_pedido_alm',
          ],

        }
      ],
      transaction: t
    });

    return empaqueCompleto;
  },

  finalizarEmpaquePedido: async (
    id_pedido_empaque: string,
    payload: IFinalizarEmpaquePayload,
    t?: Transaction
  ) => {
    const { cajas, bolsas, nota = null } = payload;

    if (cajas < 0 || bolsas < 0) {
      throw new Error('Las cantidades de cajas y bolsas no pueden ser negativas');
    }

    if (cajas === 0 && bolsas === 0) {
      throw new Error('Debes capturar al menos un bulto');
    }

    const empaque = await Pedido_Almacen_Empaque.findByPk(id_pedido_empaque, {
      transaction: t
    });
    await Pedido_AlmacenRepository.cambiarStatusAEmpacado(empaque.id_pedido_almacen)
    await empaque.update(
      {
        cajas,
        bolsas,
        nota,
        estado: 'EMPACADO',
        fin: new Date(),
      },
      { transaction: t }
    );

    return empaque;
  },

  actualizarBultosEmpaque: async (
    id_pedido_almacen: string,
    payload: IActualizarBultosPayload,
    t?: Transaction
  ) => {
    const empaque = await Pedido_Almacen_Empaque.findOne({
      where: { id_pedido_almacen },
      transaction: t
    });

    if (!empaque) {
      throw new Error('No existe registro de empaque para este pedido');
    }

    if (empaque.estado === 'CANCELADO') {
      throw new Error('No se pueden modificar bultos de un empaque cancelado');
    }

    const cajas = payload.cajas ?? empaque.cajas;
    const bolsas = payload.bolsas ?? empaque.bolsas;

    if (cajas < 0 || bolsas < 0) {
      throw new Error('Las cantidades de cajas y bolsas no pueden ser negativas');
    }

    if (cajas === 0 && bolsas === 0) {
      throw new Error('El pedido debe tener al menos un bulto');
    }

    await empaque.update(
      {
        cajas,
        bolsas,
        nota: payload.nota ?? empaque.nota
      },
      { transaction: t }
    );

    return empaque;
  },

  reabrirEmpaque: async (
    id_pedido_almacen: string,
    id_empleado_empaco: string,
    t?: Transaction
  ) => {
    const empaque = await Pedido_Almacen_Empaque.findOne({
      where: { id_pedido_almacen },
      transaction: t
    });

    if (!empaque) {
      throw new Error('No existe registro de empaque para este pedido');
    }

    if (empaque.estado === 'CANCELADO') {
      throw new Error('No se puede reabrir un empaque cancelado');
    }

    await empaque.update(
      {
        estado: 'EN_PROCESO',
        id_empleado_empaco,
        fin: null
      },
      { transaction: t }
    );

    return empaque;
  },
  obtenerEmpaqueConPedido: async (id_pedido_empaque: string, t?: Transaction) => {
    return await Pedido_Almacen_Empaque.findByPk(id_pedido_empaque, {
      include: [
        {
          model: Pedido_Almacen,
          as: 'pedido',
          attributes: ['id_pedido_alm', 'cod_int_pedido_alm']
        }
      ],
      transaction: t
    });
  }
};