import MonederoCliente from '../../../models/Clientes/Monedero/Monedero';
import { Transaction } from 'sequelize';
import { MovimientoMonederoRepository } from '../../../repository/Clientes/Monedero/Movimiento_Monedero.repository';

export const MovimientoMonederoService = {
<<<<<<< HEAD
  registrarMovimiento: async (
    id_monedero: string,
    tipo: 'ACUMULO' | 'DESCUENTO' | 'REVERSO' | 'AJUSTE',
    monto: number,
    referencia: string,
    t?: Transaction
  ) => {
    /*return await MovimientoMonederoRepository.create(
      {
        id_monedero,
        tipo_movimiento: tipo,
        monto,
        referencia
      },
      { transaction: t }
    );*/
  },
=======
    registrarMovimiento: async (
        id_monedero: string,
        tipo: "ACUMULO" | "DESCUENTO" | "REVERSO" | "AJUSTE",
        monto: number,
        referencia: string,
        t?: Transaction
    ) => {
        return await MovimientoMonederoRepository.create(
            {
                id_monedero,
                tipo_mov: tipo,
                cantidad_mov: monto,
                referencia,
                fecha_mov: new Date(),
                id_empre: "SYSTEM",
            },
            { transaction: t }
        );
    },
>>>>>>> 0d7770ad84cb265ab86c647d04065cfc3ffd6b55

  acumularSaldoPorVenta: async (id_cliente: string, monto: number, t: Transaction) => {
    const monedero = await MonederoCliente.findOne({
      where: { id_cliente },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!monedero) throw new Error('Monedero no encontrado');

    const saldoActual = Number(monedero.saldo_monedero);
    const nuevoSaldo = saldoActual + monto;

    await monedero.update({ saldo_monedero: nuevoSaldo }, { transaction: t });
    /*await MovimientoMonederoRepository.create(
            {
                id_monedero: monedero.id_monedero,
                tipo_mov: "ACUMULO",
                cantidad_mov: monto,
                referencia: `ACUMULO VENTA`,
                fecha_mov: new Date(),
                id_empre: "SYSTEM",
            },
            { transaction: t }
        );*/

<<<<<<< HEAD
    return nuevoSaldo;
  }
=======
        return nuevoSaldo;
    },

    getMovimientosByMonedero: async (id_monedero: string) => {
        if (!id_monedero) {
            throw new Error("id_monedero es requerido");
        }
        const movimientos = await MovimientoMonederoRepository.getByMonedero(id_monedero);
        return movimientos;
    },


>>>>>>> 0d7770ad84cb265ab86c647d04065cfc3ffd6b55
};
