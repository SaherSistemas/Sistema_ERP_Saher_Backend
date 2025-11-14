import { ICorteCaja, ICreateOrUpdateCorteCaja } from "../../interface/Caja/Corte_Caja.interface";
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

    createCorteCaja: async (id_caja : string, id_usuario_apertura: string, monto_inicial: number) => {
        return await CorteCajaRepository.createCorteCaja(id_caja, id_usuario_apertura, monto_inicial);
    },

    updateCorteCaja: async (id_caja: string, id_usuario_cierre: string, monto_declarado:number) => {
        return await CorteCajaRepository.updateCorteCaja(id_caja, id_usuario_cierre, monto_declarado);
    },

   
};