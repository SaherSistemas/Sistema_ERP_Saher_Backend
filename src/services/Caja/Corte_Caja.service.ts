import { dbLocal } from "../../config/db";
import { ICorteCaja, ICreateOrUpdateCorteCaja } from "../../interface/Caja/Corte_Caja.interface";
import Caja from "../../models/Caja/Caja";
import Movimiento_Caja from "../../models/Caja/Movimiento_Caja";
import { CajaRepository } from "../../repository/Caja/Caja.repository";
import { CorteCajaRepository } from "../../repository/Caja/Corte_Caja.repository";
import { MovimientoCajaRepository } from "../../repository/Caja/Movimiento_Caja.repository";

export const CorteCajaService = {
    getAll: async () => {
        return await CorteCajaRepository.getAll();
    },

    getByIDFlexible: async (id_corte: string) => {
        return await CorteCajaRepository.getByIDFlexible(id_corte);
    },

    getAllByCaja: async (id_caja: string) => {
        return await CorteCajaRepository.getAllByCaja(id_caja);
    },

    calcularTotalCaja: async (id_corte: string) => {
        const movimientos = await Movimiento_Caja.findAll({
            where: { id_corte },
        });

        let total = 0;

        movimientos.forEach(m => {
            total += Number(m.monto_movimiento);
        });

        return total;
    },


    getCantidadCortesPorCaja: async (id_caja: string) => {
        return await CorteCajaRepository.getCantidadCortesPorCaja(id_caja);
    },

    createCorteCaja: async ({
        id_caja,
        id_usuario_apertura,
        monto_inicial
    }: {
        id_caja: string;
        id_usuario_apertura: string;
        monto_inicial: number;
    }) => {

        const t = await dbLocal.transaction();
        try {
            const caja = await CajaRepository.getByIDFlexible(id_caja, { transaction: t });

            if (!caja) {
                throw new Error("Caja no encontrada.");
            }

            if (caja.activa === false) {
                throw new Error("La caja no está activa.");
            }

            const corte = await CorteCajaRepository.createCorteCaja(
                id_caja,
                id_usuario_apertura,
                monto_inicial,
                { transaction: t }
            );

            // await caja.update(
            //     {
            //         abierta: true,
            //         id_usuario_apertura,
            //         fecha_apertura: new Date(),
            //     },
            //     { transaction: t }
            // );

            await MovimientoCajaRepository.create(
                {
                    id_caja: id_caja,
                    id_corte: corte.id_corte,
                    tipo_movimiento: "INGRESO",
                    concepto_movimiento: "FONDO INICIAL",
                    id_metodo_pago: null,
                    monto_movimiento: monto_inicial,
                    referencia: `APERTURA DE CORTE ${corte.id_corte}`,
                    id_empleado: id_usuario_apertura,
                },
                { transaction: t }
            );


            await t.commit();

            return {
                message: "Corte creado, caja abierta y fondo inicial registrado",
                corte
            };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    updateCorteCaja: async (id_caja: string, id_usuario_cierre: string, monto_declarado: number) => {
        return await CorteCajaRepository.updateCorteCaja(id_caja, id_usuario_cierre, monto_declarado);
    },


};