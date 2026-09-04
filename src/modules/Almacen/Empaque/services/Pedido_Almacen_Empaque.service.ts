import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Empleado from '../../../RRHH/model/Empleado';
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
    nota?: string | null,
    num_empleado?: string | null
  ) => {
    if (!id_pedido_empaque) {
      throw new Error('El id_pedido_empaque es requerido');
    }

    if (cajas === undefined || bolsas === undefined) {
      throw new Error('Debes enviar cajas y bolsas');
    }

    // Buscar empleado por número interno si se proporcionó
    let id_empleado_empaco: string | null = null;
    if (num_empleado?.trim()) {
      const numInt = parseInt(num_empleado.trim(), 10);
      if (!isNaN(numInt)) {
        const emp = await Empleado.findOne({
          where: { idinterno_empleado: numInt },
          attributes: ['id_empleado'],
          raw: true,
        }) as any;
        if (!emp) throw new Error(`No se encontró ningún empleado con número ${num_empleado}`);
        id_empleado_empaco = emp.id_empleado;
      }
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
      const bultos = await Bulto_PedidoRepository.bulkCrearBultos(bultosPayload, t);

      const actualizado = await Pedido_Almacen_EmpaqueRepository.finalizarEmpaquePedido(
        id_pedido_empaque,
        {
          cajas,
          bolsas,
          nota: nota ?? null,
          ...(id_empleado_empaco ? { id_empleado_empaco } : {}),
        },
        t
      );

      return { ...actualizado.toJSON(), bultos };
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

  reabrirConBultos: async (
    id_pedido_empaque: string,
    cajas: number,
    bolsas: number,
    nota: string | null | undefined,
    num_empleado?: string | null
  ) => {
    if (!id_pedido_empaque) throw new Error('El id_pedido_empaque es requerido');
    if (cajas + bolsas <= 0) throw new Error('Debes enviar al menos un bulto');

    let id_empleado_empaco: string | null = null;
    if (num_empleado?.trim()) {
      const numInt = parseInt(num_empleado.trim(), 10);
      if (!isNaN(numInt)) {
        const emp = await Empleado.findOne({
          where: { idinterno_empleado: numInt },
          attributes: ['id_empleado'],
          raw: true,
        }) as any;
        if (!emp) throw new Error(`No se encontró ningún empleado con número ${num_empleado}`);
        id_empleado_empaco = emp.id_empleado;
      }
    }

    return await dbLocal.transaction(async (t: Transaction) => {
      const empaque = await Pedido_Almacen_EmpaqueRepository.getById(id_pedido_empaque, t);
      if (!empaque) throw new Error('No existe el empaque');
      if (empaque.estado === 'CANCELADO') throw new Error('No se puede reabrir un empaque cancelado');

      // 1) Eliminar bultos anteriores
      await Bulto_PedidoRepository.eliminarBultosDe(id_pedido_empaque, t);

      // 2) Generar nuevos bultos renumerados
      const totalBultos = cajas + bolsas;
      let contador = 1;
      const cod = empaque.pedido.cod_int_pedido_alm;

      const bultosPayload = [
        ...Array.from({ length: cajas }, () => ({
          id_pedido_empaque,
          cod_bulto: `${cod}-${contador}`,
          tipo_bulto: 'CAJA' as const,
          num_bulto: contador++,
          total_bulto: totalBultos,
          escaneado: false,
        })),
        ...Array.from({ length: bolsas }, () => ({
          id_pedido_empaque,
          cod_bulto: `${cod}-${contador}`,
          tipo_bulto: 'BOLSA' as const,
          num_bulto: contador++,
          total_bulto: totalBultos,
          escaneado: false,
        })),
      ];

      const bultos = await Bulto_PedidoRepository.bulkCrearBultos(bultosPayload, t);

      // 3) Actualizar empaque con nuevos totales y dejarlo EMPACADO
      await empaque.update({
        cajas, bolsas, nota: nota ?? empaque.nota, estado: 'EMPACADO', fin: new Date(),
        ...(id_empleado_empaco ? { id_empleado_empaco } : {}),
      }, { transaction: t });

      return { empaque: empaque.toJSON(), bultos };
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