import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { Pedido_Almacen_EmpaqueRepository } from '../repositories/Pedido_Almacen_Empaque.repository';
import { IActualizarBultosPayload } from '../interface/Pedido_Almacen_Empaque.interface';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';
import { Bulto_PedidoRepository } from '../repositories/Bulto_Pedido.repository';


export const Pedido_Almacen_EmpaqueService = {
  obtenerPedidoEmpacando: async () => {
    return await Pedido_Almacen_EmpaqueRepository.obtenerPedidoEmpacando();
  },


  iniciarEmpaquePedido: async (id_pedido_empaque: string, id_empleado_empaco: string) => {
    if (!id_pedido_empaque) {
      throw new Error('El id_pedido_empaque es requerido');
    }

    if (!id_empleado_empaco) {
      throw new Error('El id_empleado_empaco es requerido');
    }

    return await dbLocal.transaction(async (t: Transaction) => {
      const existePedidoYListoParaEmpacar = await Pedido_AlmacenRepository.pedidoListoParaEmpacar(id_pedido_empaque);
      // console.log(existePedidoYListoParaEmpacar)
      if (!existePedidoYListoParaEmpacar) {
        throw new Error('El pedido no esta listo para empacar');
      }

      const empaque = await Pedido_Almacen_EmpaqueRepository.iniciarEmpaquePedido(
        existePedidoYListoParaEmpacar.id_pedido_alm,
        id_empleado_empaco,
        t
      );

      return empaque;
    });
  },

  finalizarEmpaquePedido: async (
    id_pedido_empaque: string,
    cajas: number,
    bolsas: number,
    nota?: string | null
  ) => {
    if (!id_pedido_empaque) {
      throw new Error('El id_pedido_empaque es requerido');
    }

    if (cajas === undefined || bolsas === undefined) {
      throw new Error('Debes enviar cajas y bolsas');
    }

    return await dbLocal.transaction(async (t: Transaction) => {
      const empaque = await Pedido_Almacen_EmpaqueRepository.getById(id_pedido_empaque, t);

      if (!empaque) {
        throw new Error('No existe un empaque iniciado para este pedido');
      }
      const totalBultos = cajas + bolsas;
      let contador = 1;
      const codIntPedido = empaque.pedido.cod_int_pedido_alm;

      const bultosPayload = [
        ...Array.from({ length: cajas }, (_, index) => ({
          id_pedido_empaque,
          cod_bulto: `${codIntPedido}-${contador}`,
          tipo_bulto: 'CAJA' as const,
          num_bulto: contador++,
          total_bulto: totalBultos,
          escaneado: false
        })),
        ...Array.from({ length: bolsas }, (_, index) => ({
          id_pedido_empaque,
          cod_bulto: `${codIntPedido}-${contador}`,
          tipo_bulto: 'BOLSA' as const,
          num_bulto: contador++,
          total_bulto: totalBultos,
          escaneado: false
        }))
      ];
      await Bulto_PedidoRepository.bulkCrearBultos(bultosPayload, t);

      const actualizado = await Pedido_Almacen_EmpaqueRepository.finalizarEmpaquePedido(
        id_pedido_empaque,
        {
          cajas,
          bolsas,
          nota: nota ?? null
        },
        t
      );

      return actualizado;
    });
  },

  actualizarBultosEmpaque: async (
    id_pedido_empaque: string,
    payload: IActualizarBultosPayload
  ) => {
    if (!id_pedido_empaque) {
      throw new Error('El id_pedido_empaque es requerido');
    }

    if (
      payload.cajas === undefined &&
      payload.bolsas === undefined &&
      payload.nota === undefined
    ) {
      throw new Error('Debes enviar al menos un campo para actualizar');
    }

    return await dbLocal.transaction(async (t: Transaction) => {
      /*const empaque = await Pedido_Almacen_EmpaqueRepository.getByPedidoId(id_pedido_empaque, t);

      if (!empaque) {
        throw new Error('No existe registro de empaque para este pedido');
      }

      if (empaque.estado === 'CANCELADO') {
        throw new Error('No se puede modificar un empaque cancelado');
      }*/

      const actualizado = await Pedido_Almacen_EmpaqueRepository.actualizarBultosEmpaque(
        id_pedido_empaque,
        payload,
        t
      );

      return actualizado;
    });
  },

  reabrirEmpaquePedido: async (id_pedido_empaque: string, id_empleado_empaco: string) => {
    if (!id_pedido_empaque) {
      throw new Error('El id_pedido_empaque es requerido');
    }

    if (!id_empleado_empaco) {
      throw new Error('El id_empleado_empaco es requerido');
    }

    return await dbLocal.transaction(async (t: Transaction) => {
      /* const empaque = await Pedido_Almacen_EmpaqueRepository.getByPedidoId(id_pedido_empaque, t);
 
       if (!empaque) {
         throw new Error('No existe registro de empaque para este pedido');
       }
 
       if (empaque.estado === 'CANCELADO') {
         throw new Error('No se puede reabrir un empaque cancelado');
       }*/

      const actualizado = await Pedido_Almacen_EmpaqueRepository.reabrirEmpaque(
        id_pedido_empaque,
        id_empleado_empaco,
        t
      );

      return actualizado;
    });
  }
};