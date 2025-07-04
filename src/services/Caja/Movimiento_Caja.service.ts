import { IMovimientoCaja } from "../../interface/Caja/Movimiento_Caja.interface";
import { MovimientoCajaRepository } from "../../repository/Caja/Movimiento_Caja.repository";


export const MovimientoCajaService = {

    getAll: async () => {
        return await MovimientoCajaRepository.getAll();
    },

    getByIDFlexible: async (id_movimiento: string) => {
        return await MovimientoCajaRepository.getByIDFlexible(id_movimiento);
    },

    createMovimientoCaja: async (data: IMovimientoCaja) => {
        return await MovimientoCajaRepository.createMovimientoCaja(data);
    },

    updateMovimientoCaja: async (id_movimiento: string, data: IMovimientoCaja) => {
        return await MovimientoCajaRepository.updateMovimientoCaja(id_movimiento, data);
    },
};




