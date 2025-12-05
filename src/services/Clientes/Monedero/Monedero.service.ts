import {
  ICreateOrUpdateMonedero,
} from "../../../interface/Clientes/Monedero/Modenero.interface";
import { MonederoRepository } from "../../../repository/Clientes/Monedero/Monedero.repository";
import MonederoCliente from "../../../models/Clientes/Monedero/Monedero";
import Cliente from "../../../models/Clientes/Cliente";
import { Transaction } from "sequelize";
import { MovimientoMonederoRepository } from "../../../repository/Clientes/Monedero/Movimiento_Monedero.repository";

export const MonederoService = {
  getAll: async () => {
    return await MonederoRepository.getAll();
  },

  getByTelefono: async (telefono: string) => {
    if (!telefono) {
      throw new Error("Teléfono no enviado.");
    }

    const data = await MonederoRepository.getByTelefono(telefono);

    if (!data || !data.monedero) {
      const err = new Error("Monedero no encontrado para ese teléfono.");
      (err as any).status = 404;
      throw err;
    }

    return data;
  },

  createMonedero: async (data: ICreateOrUpdateMonedero) => {
    const monederoExistente = await MonederoRepository.getByCliente(
      data.id_cliente.trim()
    );
    if (monederoExistente) {
      throw new Error("Ya existe un monedero para este cliente");
    }
    return await MonederoRepository.createMonedero(data);
  },

  deleteMonedero: async (id_monedero: string) => {
    return await MonederoRepository.deleteMonedero(id_monedero);
  },

  acumularSaldoporTelefono: async (telefono: string, saldo: number) => {
    if (typeof saldo !== "number" || saldo <= 0) {
      throw new Error("Monto invalido");
    }
    const cliente = await Cliente.findOne({
      where: { telefono_cliente: telefono },
      attributes: ["id_cliente", "nombre_cliente"],
    });
    if (!cliente) {
      throw new Error("Cliente no encontrado");
    }
    const monedero = await MonederoCliente.findOne({
      where: { id_cliente: cliente.id_cliente },
    })

    if (!monedero) {
      throw new Error("Monedero del cliente no encontrado");
    }
    const resultado = await MonederoRepository.acumularSaldo(monedero, saldo);

    return {
      nombre_cliente: cliente.nombre_cliente,
      nuevo_saldo: resultado.nuevo_saldo,
    };

  },

  acumularSaldoPorVenta: async (
    id_cliente: string,
    id_empre: string,
    monto: number,
    t: Transaction
  ) => {

    if (!id_cliente) return;
    if (monto <= 0) return;

    // 1. Buscar monedero del cliente con lock
    const monedero = await MonederoCliente.findOne({
      where: { id_cliente },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!monedero) {
      throw new Error("El cliente no tiene monedero registrado.");
    }

    // 2. Nuevo saldo
    const saldoActual = Number(monedero.saldo_monedero);
    const nuevoSaldo = saldoActual + monto;

    // 3. Actualizar monedero
    await monedero.update(
      { saldo_monedero: nuevoSaldo },
      { transaction: t }
    );

    await MovimientoMonederoRepository.create(
      {
        id_monedero: monedero.id_monedero,
        id_empre,
        cantidad_mov: monto,
        tipo_mov: "ACUMULO",
        referencia: "ACUMULO POR VENTA",
        fecha_mov: new Date(),
      },
      { transaction: t }
    );

    return { nuevoSaldo };
  },

  descontarSaldoPorVenta: async (
    id_cliente: string,
    id_empre: string,
    monto: number,
    t: Transaction
  ) => {

    if (!id_cliente) return;
    if (monto <= 0) return;

    const monedero = await MonederoCliente.findOne({
      where: { id_cliente },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!monedero) {
      throw new Error("El cliente no tiene monedero registrado.");
    }

    const saldoActual = Number(monedero.saldo_monedero);

    if (saldoActual < monto) {
      throw new Error("Saldo insuficiente en el monedero.");
    }

    const nuevoSaldo = saldoActual - monto;

    await monedero.update(
      { saldo_monedero: nuevoSaldo },
      { transaction: t }
    );

    await MovimientoMonederoRepository.create(
      {
        id_monedero: monedero.id_monedero,
        id_empre,
        cantidad_mov: monto,
        tipo_mov: "DESCUENTO",
        referencia: "USO EN VENTA",
        fecha_mov: new Date(),
      },
      { transaction: t }
    );

    return { nuevoSaldo };
  },


};
