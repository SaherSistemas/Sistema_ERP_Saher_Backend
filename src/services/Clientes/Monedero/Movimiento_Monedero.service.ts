import MonederoCliente from '../../../models/Clientes/Monedero/Monedero';
import { Transaction } from 'sequelize';
import { MovimientoMonederoRepository } from '../../../repository/Clientes/Monedero/Movimiento_Monedero.repository';

export const MovimientoMonederoService = {
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
                tipo_movimiento: "ACUMULO",
                monto,
                referencia: `ACUMULO VENTA`,
            },
            { transaction: t }
        );*/

    return nuevoSaldo;
  }
};
