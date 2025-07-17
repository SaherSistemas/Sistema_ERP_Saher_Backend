import { ICorteCaja, ICorteCajaUpdate } from "../../interface/Caja/Corte_Caja.interface";
import { CorteCajaRepository } from "../../repository/Caja/Corte_Caja.repository";

export const CorteCajaService = {
    getAll: async () => {
        return await CorteCajaRepository.getAll();
    },

    getByIDFlexible: async (id_corte: string) => {
        return await CorteCajaRepository.getByIDFlexible(id_corte);
    },

    getCantidadCortesPorCaja: async (id_caja: string) => {
        return await CorteCajaRepository.getCantidadCortesPorCaja(id_caja);
    },

    createCorteCaja: async (data: ICorteCaja) => {
        return await CorteCajaRepository.createCorteCaja(data);
    },

    updateCorteCaja: async (id_corte: string, data: ICorteCaja) => {
        return await CorteCajaRepository.updateCorteCaja(id_corte, data);
    },

    updateCierreCorteCaja: async (id_corte: string, data: ICorteCajaUpdate) => {
        return await CorteCajaRepository.updateCierreCorteCaja(id_corte, data);
    }
};