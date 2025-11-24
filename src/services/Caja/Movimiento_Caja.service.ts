import { ConceptoMovimiento, IMovimientoCaja, IMovimientoCajaCreate, TipoMovimiento } from "../../interface/Caja/Movimiento_Caja.interface";
import { CorteCajaRepository } from "../../repository/Caja/Corte_Caja.repository";
import { MovimientoCajaRepository } from "../../repository/Caja/Movimiento_Caja.repository";
import { CorteCajaService } from "./Corte_Caja.service";
import { Transaction } from "sequelize";


export const MovimientoCajaService = {

    getAll: async () => {
        return await MovimientoCajaRepository.getAll();
    },

    getByIDFlexible: async (id_movimiento: string) => {
        return await MovimientoCajaRepository.getByIDFlexible(id_movimiento);
    },

    getAllByCaja: async (id_caja: string) => {
        return await MovimientoCajaRepository.getAllByCaja(id_caja);
    },
    getAllByCorte: async (id_corte: string) => {
        return await MovimientoCajaRepository.getAllByCorte(id_corte);
    },

    createMovimientoCaja: async (
        data: IMovimientoCajaCreate,
        options?: { transaction?: Transaction }
    ) => {

        const { transaction: t } = options || {};

        const tiposSalida: TipoMovimiento[] = ["RETIRO", "REVERSO"];
        const conceptosSalida: ConceptoMovimiento[] = [
            "CANCELACION DE VENTA",
            "DEVOLUCION PARCIAL",
            "RETIRO PARCIAL"
        ];

        const esSalida =
            tiposSalida.includes(data.tipo_movimiento) ||
            conceptosSalida.includes(data.concepto_movimiento);

        if (esSalida) {

            const corte = await CorteCajaRepository.getCorteAbiertoByCaja(data.id_caja);
            if (!corte) {
                throw new Error("No hay corte abierto para realizar retiros.");
            }

            const saldoActual = await CorteCajaService.calcularTotalCaja(corte.id_corte);

            const montoSolicitado = Math.abs(data.monto_movimiento);

            if (montoSolicitado > saldoActual) {
                throw new Error(
                    `Fondos insuficientes en el corte. ` +
                    `Saldo actual: $${saldoActual.toFixed(2)}, ` +
                    `retiro solicitado: $${montoSolicitado.toFixed(2)}`
                );
            }

            // Normalizar monto negativo
            data.monto_movimiento = -montoSolicitado;
        }

        // Entradas (ventas)
        if (!esSalida) {
            data.monto_movimiento = Math.abs(data.monto_movimiento);
        }

        return await MovimientoCajaRepository.create(data, {
            transaction: t
        });
    },



    updateMovimientoCaja: async (id_movimiento: string, data: IMovimientoCaja) => {
        return await MovimientoCajaRepository.updateMovimientoCaja(id_movimiento, data);
    },
};




